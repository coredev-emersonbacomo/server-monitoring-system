#!/usr/bin/env node
// npm run host — native dev stack (Redis, Laravel :8000, Vite HMR, Reverb,
// queue, schedule) plus an ngrok tunnel to Vite :5173, so any remote device
// opens the app through the public https URL instead of the LAN.
//
// Needs, in your gitignored .env:
//   NGROK_DOMAIN=your-reserved.ngrok-free.dev
// Starts php artisan serve (:8000) unless another backend already owns the
// port, then the rest of the stack via scripts/entry.js.
//
// Architecture matches scripts/ngrok.js:
//   Internet → ngrok → Vite :5173 (HMR WebSocket included)
//                    Vite proxy → Laravel API :8000 (local, never exposed)

import fs from "fs";
import path from "path";
import net from "net";
import { fileURLToPath } from "url";
import { spawn, spawnSync } from "child_process";
import { loadEnvIntoProcess, restoreEnvLine } from "./load-env.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const logFile = path.join(root, ".ngrok.log");
const pidFile = path.join(root, ".ngrok.pid");
const envPath = path.join(root, ".env");
const backendUrl = "http://127.0.0.1:8000";

const php = (process.env.PHP_BINARY && fs.existsSync(process.env.PHP_BINARY))
  ? process.env.PHP_BINARY
  : (fs.existsSync("C:\\tools\\php85\\php.exe")
      ? "C:\\tools\\php85\\php.exe"
      : (process.env.USERPROFILE
          ? [
              path.join(process.env.USERPROFILE, ".config", "herd", "bin", "php84", "php.exe"),
              path.join(process.env.USERPROFILE, ".config", "herd", "bin", "php83", "php.exe"),
              path.join(process.env.USERPROFILE, ".config", "herd", "bin", "php82", "php.exe"),
            ].find((p) => fs.existsSync(p))
          : null)
        || "php");

function portOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const sock = net.connect(port, host);
    sock.once("connect", () => { sock.end(); resolve(true); });
    sock.once("error", () => resolve(false));
    sock.setTimeout(1500, () => { sock.destroy(); resolve(false); });
  });
}

function getNgrokAuthtoken() {
  if (process.env.NGROK_AUTHTOKEN) return process.env.NGROK_AUTHTOKEN;
  const candidates = [
    path.join(process.env.HOME || "", ".config", "ngrok", "ngrok.yml"),
    path.join(process.env.HOME || "", ".ngrok2", "ngrok.yml"),
    ...(process.env.LOCALAPPDATA ? [path.join(process.env.LOCALAPPDATA, "ngrok", "ngrok.yml")] : []),
  ];
  for (const p of candidates) {
    try {
      const m = fs.readFileSync(p, "utf8").match(/^\s*authtoken:\s*(\S+)/m);
      if (m) return m[1];
    } catch {}
  }
  return undefined;
}

function tunnelReady(domain) {
  if (!fs.existsSync(logFile)) return false;
  const log = fs.readFileSync(logFile, "utf8");
  return log.includes("started tunnel") && log.includes(domain);
}

// Fixed-width dotted status lines, same shape as scripts/ngrok.js.
const STATUS_WIDTH = 30;
function statusLine(label, status) {
  const dots = ".".repeat(Math.max(2, STATUS_WIDTH - label.length));
  console.log(`[host] ${label} ${dots} ${status}`);
}

function elapsedSec(t0) {
  return Math.round((Date.now() - t0) / 1000);
}

const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
function paint(codes, s) {
  return useColor ? `\x1b[${codes}m${s}\x1b[0m` : s;
}
const cyan = (s) => paint(36, s);
const green = (s) => paint(32, s);
const greenBold = (s) => paint("32;1", s);
const dim = (s) => paint(2, s);

function exitLog(line = "") {
  try { fs.writeSync(1, line + "\n"); } catch {}
}

async function waitFor(fn, tries, delayMs, onTick) {
  for (let i = 0; i < tries; i++) {
    if (await fn()) return true;
    if (onTick) onTick((i + 1) * delayMs / 1000);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return false;
}

async function httpOk(url) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const res = await fetch(url, { cache: "no-store", signal: controller.signal });
      return res.ok;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

// Single-instance guard shared with scripts/ngrok.js (.ngrok.pid): refuse to
// start while another ngrok/host run is alive so two tunnels never fight over
// the same reserved domain. Crash-safe — a stale pid file is overwritten.
const OWNED_MARKERS = ["scripts/ngrok.js", "scripts/host.js"];
function liveRunnerPid() {
  let pid = 0;
  try {
    pid = parseInt(fs.readFileSync(pidFile, "utf8").trim(), 10) || 0;
  } catch {
    return 0;
  }
  if (!pid || pid === process.pid) return 0;
  try {
    let cmdline = "";
    if (process.platform === "win32") {
      const r = spawnSync("powershell", ["-NoProfile", "-Command", `(Get-CimInstance Win32_Process -Filter 'ProcessId = ${pid}').CommandLine`], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
        timeout: 10000,
      });
      cmdline = r.status === 0 ? r.stdout || "" : "";
    } else {
      const r = spawnSync("ps", ["-p", String(pid), "-o", "args="], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      cmdline = r.status === 0 ? r.stdout || "" : "";
    }
    if (OWNED_MARKERS.some((m) => cmdline.includes(m))) return pid;
  } catch {}
  return 0;
}

let listener = null;
let ngrokChild = null;
let entryChild = null;
let backendChild = null;
let envFileTouched = false;
let prevAppUrlLine = null;
let prevSkipLine = null;

function cleanup() {
  try { fs.unlinkSync(pidFile); } catch {}
  try { listener?.close(); } catch {}
  if (ngrokChild?.pid) {
    if (process.platform === "win32") {
      try { spawnSync("taskkill", ["/pid", String(ngrokChild.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
    } else {
      try { process.kill(ngrokChild.pid, "SIGTERM"); } catch {}
    }
  }
  if (backendChild?.pid) {
    if (process.platform === "win32") {
      try { spawnSync("taskkill", ["/pid", String(backendChild.pid), "/T", "/F"], { stdio: "ignore" }); } catch {}
    } else {
      try { process.kill(backendChild.pid, "SIGTERM"); } catch {}
    }
  }
  if (envFileTouched) {
    try {
      let content = fs.readFileSync(envPath, "utf8");
      content = restoreEnvLine(content, "APP_URL", prevAppUrlLine);
      content = restoreEnvLine(content, "NGROK_SKIP_BROWSER_WARNING", prevSkipLine);
      fs.writeFileSync(envPath, content);
    } catch {}
  }
  try { listener?.close(); } catch {}
}

async function startTunnel(domain, authtoken, onCtx) {
  try {
    const sdk = await import("@ngrok/ngrok");
    listener = await sdk.forward({
      addr: 5173,
      domain: domain,
      ...(authtoken ? { authtoken } : { authtoken_from_env: true }),
    });
    return true;
  } catch (sdkErr) {
    onCtx(sdkErr);
    try { fs.unlinkSync(logFile); } catch {}
    ngrokChild = spawn("ngrok", ["http", "5173", `--domain=${domain}`, `--log=${logFile}`, "--log-format=json"], {
      stdio: "ignore",
      windowsHide: true,
      cwd: root,
    });
    return waitFor(() => tunnelReady(domain), 20, 1000);
  }
}

async function main() {
  loadEnvIntoProcess([".env.development", ".env"]);

  const domain = String(process.env.NGROK_DOMAIN || "").trim().replace(/^https?:\/\//, "");
  const authtoken = getNgrokAuthtoken();

  if (process.argv.includes("--check")) {
    console.log(`[host] NGROK_DOMAIN=${domain || "(missing)"}`);
    console.log(`[host] ngrok authtoken: ${authtoken ? "present" : "MISSING (login via \`ngrok config add-authtoken <token>\`)"}`);
    if (domain && authtoken) {
      console.log(`[host] backend ${backendUrl}/api/health: ${(await httpOk(`${backendUrl}/api/health`)) ? "REACHABLE" : "NOT RESPONDING"}`);
    }
    process.exit(domain && authtoken ? 0 : 1);
  }

  if (!domain) {
    console.error("[host] ERROR: NGROK_DOMAIN environment variable is required");
    console.error("[host] Add NGROK_DOMAIN=your-reserved.ngrok-free.dev to your .env");
    process.exit(1);
  }

  const otherPid = liveRunnerPid();
  if (otherPid) {
    console.error(`[host] Another ngrok/host run is already active (PID ${otherPid}). Stop it first, then re-run.`);
    process.exit(1);
  }
  try { fs.writeFileSync(pidFile, String(process.pid)); } catch {}

  const tunnelUrl = `https://${domain}`;

  // Tunnel env for every child (redis/vite/docs/reverb go through entry.js):
  // Vite reads NGROK_DOMAIN for allowedHosts/HMR and the VITE_REVERB_* for
  // WebSockets over the tunnel; the backend reads APP_URL for generated URLs.
  process.env.VITE_BACKEND_URL = backendUrl;
  process.env.NGROK_UPSTREAM = backendUrl;
  process.env.NGROK_DOMAIN = domain;
  process.env.VITE_REVERB_HOST = domain;
  process.env.VITE_REVERB_PORT = "443";
  process.env.VITE_REVERB_SCHEME = "https";
  process.env.VITE_DOCS_URL = tunnelUrl;
  process.env.APP_URL = tunnelUrl;
  // Lets generated agent install commands bypass ngrok's free-tier browser
  // interstitial.
  process.env.NGROK_SKIP_BROWSER_WARNING = "true";

  // The .env file is the only channel into the separate PHP backend process
  // tree: write APP_URL, snapshot the previous lines, restore on exit.
  let envContent = "";
  try { envContent = fs.readFileSync(envPath, "utf8"); } catch {}
  prevAppUrlLine = envContent.match(/^APP_URL=.*$/m)?.[0] ?? null;
  prevSkipLine = envContent.match(/^NGROK_SKIP_BROWSER_WARNING=.*$/m)?.[0] ?? null;
  if (envContent.match(/^APP_URL=.*$/m)) {
    envContent = envContent.replace(/^APP_URL=.*$/m, `APP_URL=${tunnelUrl}`);
  } else {
    envContent += (envContent.endsWith("\n") || !envContent ? "" : "\n") + `APP_URL=${tunnelUrl}\n`;
  }
  if (envContent.match(/^NGROK_SKIP_BROWSER_WARNING=.*$/m)) {
    envContent = envContent.replace(/^NGROK_SKIP_BROWSER_WARNING=.*$/m, "NGROK_SKIP_BROWSER_WARNING=true");
  } else {
    envContent += (envContent.endsWith("\n") || !envContent ? "" : "\n") + "NGROK_SKIP_BROWSER_WARNING=true\n";
  }
  fs.writeFileSync(envPath, envContent);
  envFileTouched = true;

  // Backend: reuse an existing process on :8000, otherwise start
  // `php artisan serve` so the full stack comes up from `npm run host` alone.
  console.log("[host] Checking backend on :8000...");
  const backendAlready = await portOpen(8000);
  if (backendAlready) {
    console.log("[host] Backend already listening on :8000 — reusing it.");
  } else {
    console.log("[host] No backend on :8000 — starting `php artisan serve --host=127.0.0.1 --port=8000`...");
    backendChild = spawn(php, ["artisan", "serve", "--host=127.0.0.1", "--port=8000"], {
      stdio: "inherit",
      windowsHide: true,
      cwd: root,
      env: { ...process.env },
    });
    backendChild.on("error", (err) => {
      console.error(`[host] Failed to start php artisan serve: ${err.message}`);
      console.error("[host] Start it manually (`php artisan serve --port=8000`), then re-run.");
      backendChild = null;
    });
  }
  const backendT0 = Date.now();

  // Track spawned children so Ctrl+C cleans up even mid-boot.
  let cleanedUp = false;
  const cleanupOnce = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    exitLog("\n[host] Stopping tunnel and dev stack...");
    cleanup();
    exitLog("[host] Restored .env tunnel values.");
    exitLog("[host] Cleanup complete — safe to type.");
  };

  process.on("SIGINT", () => {
    exitLog("\n[host] Interrupted — cleaning up...");
    cleanupOnce();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanupOnce();
    process.exit(0);
  });
  process.on("exit", () => cleanupOnce());

  console.log("[host] Starting dev stack (Redis, Reverb, Vite frontend + docs, queue)...");
  entryChild = spawn(process.execPath, [path.join(root, "scripts", "entry.js"), "dev"], {
    stdio: "inherit",
    windowsHide: true,
    cwd: root,
    env: { ...process.env },
  });
  entryChild.on("error", (err) => {
    console.error(`[host] Failed to start dev stack: ${err.message}`);
    cleanupOnce();
    process.exit(1);
  });
  entryChild.on("exit", (code) => {
    cleanupOnce();
    process.exit(code ?? 0);
  });

  console.log("[host] Waiting for the Vite dev server on :5173...");
  const viteT0 = Date.now();
  const viteUp = await waitFor(() => httpOk("http://127.0.0.1:5173/"), 60, 1000);
  if (!viteUp) {
    console.error("[host] Vite dev server did not respond on :5173 within 60s. Check the [dev] output above.");
    cleanupOnce();
    process.exit(1);
  }
  statusLine("Vite dev server", green(`READY (${elapsedSec(viteT0)}s)`));

  const backendUp = backendAlready
    ? await httpOk(`${backendUrl}/api/health`)
    : await waitFor(() => httpOk(`${backendUrl}/api/health`), 120, 1000);
  if (backendUp) {
    statusLine("Backend :8000", green(`READY (${elapsedSec(backendT0)}s)`));
  } else {
    statusLine("Backend :8000", "FAILED — API calls will fail");
  }
  console.log("");

  console.log("[host] Starting ngrok tunnel to Vite (port 5173)...");
  const tunnelUp = await startTunnel(domain, authtoken, (sdkErr) => {
    console.log(`[host] ngrok SDK unavailable (${sdkErr.message}) — falling back to the ngrok CLI.`);
  });
  if (!tunnelUp) {
    console.error("[host] Tunnel did not come up. Check .ngrok.log");
    cleanupOnce();
    process.exit(1);
  }
  statusLine("Tunnel", green("LIVE"));

  console.log("");
  console.log(dim("========================================"));
  console.log(`  ${greenBold("ngrok tunnel is live (HMR mode)")}`);
  console.log(`  ${dim("➜")}  URL:     ${cyan(tunnelUrl)}`);
  console.log(`  ${dim("➜")}  API:     ${cyan(`${tunnelUrl}/api`)}`);
  console.log(`  ${dim("➜")}  Docs:    ${cyan(`${tunnelUrl}/docs`)}`);
  console.log(`  ${dim("➜")}  Backend: ${cyan(backendUrl)}`);
  console.log(dim("========================================"));
  console.log("");

  console.log("[host] Smoke-testing the public URL...");
  const connected = await waitFor(
    () => httpOk(tunnelUrl),
    30,
    1000,
    (s) => { if (s % 10 === 0) console.log(`[host] Still waiting for tunnel response... (${s}s elapsed)`); }
  );
  if (connected) {
    statusLine("Smoke test", green("200 OK"));
  } else {
    console.log("[host] Could not verify connection after 30s. Check .ngrok.log and Vite output.");
  }

  console.log("[host] Press Ctrl+C to stop tunnel, tunneled dev stack, and restore .env.");
}

main().catch((err) => {
  console.error("[host] Failed:", err.message);
  process.exit(1);
});