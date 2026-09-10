#!/usr/bin/env node
// npm run ngrok - HMR dev flow: backend (Docker app or Herd) + Vite HMR + ngrok tunnel to Vite.
// npm run docker - same runner with no tunnel: Docker app on :8000 + Vite HMR on :5173.
// Architecture:
//   Internet → ngrok → Vite :5173 (HMR WebSocket included)
//                    Vite proxy → Laravel API (local, never exposed)
//
// Configure in your gitignored .env:
//   NGROK_DOMAIN=your-reserved.ngrok-free.dev
//   NGROK_UPSTREAM=http://127.0.0.1:8000  (Docker app)
//   # OR
//   NGROK_UPSTREAM=http://server-monitoring-system.test  (Herd app)
//
// ngrok binary: MS Store install (WindowsApps alias).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, spawnSync, execSync } from "child_process";
import { loadEnvIntoProcess, restoreEnvLine } from "./load-env.js";
import { isDockerStale, markDockerFresh } from "./docker-build-state.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const logFile = path.join(root, ".ngrok.log");
const pidFile = path.join(root, ".ngrok.pid");
const envPath = path.join(root, ".env");

// Vite bin (hoisted to root node_modules in this monorepo). Running it
// directly with node avoids the npm.cmd/shell wrapper entirely.
const viteBin = fs.existsSync(path.join(root, "frontend", "node_modules", "vite", "bin", "vite.js"))
  ? path.join(root, "frontend", "node_modules", "vite", "bin", "vite.js")
  : path.join(root, "node_modules", "vite", "bin", "vite.js");

function getNgrokAuthtoken() {
  if (process.env.NGROK_AUTHTOKEN) return process.env.NGROK_AUTHTOKEN;
  try {
    const configPath = path.join(process.env.LOCALAPPDATA || "", "ngrok", "ngrok.yml");
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf8");
      const match = content.match(/^authtoken:\s*(\S+)/m);
      if (match) return match[1];
    }
  } catch {}
  return undefined;
}

function findNgrok() {
  // Check common Windows install paths
  const commonPaths = [
    path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WindowsApps", "ngrok.exe"),
    path.join(process.env.ProgramFiles || "C:\\Program Files", "ngrok", "ngrok.exe"),
    path.join(process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)", "ngrok", "ngrok.exe"),
    path.join(process.env.USERPROFILE || "", "bin", "ngrok.exe"),
    path.join(process.env.LOCALAPPDATA || "", "ngrok", "ngrok.exe"),
  ];
  for (const p of commonPaths) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  try {
    const dir = path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WindowsApps");
    if (fs.readdirSync(dir).includes("ngrok.exe")) {
      return path.join(dir, "ngrok.exe");
    }
  } catch {}
  try {
    const found = execSync("where.exe ngrok", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).split(/\r?\n/)[0]?.trim();
    if (found) return found;
  } catch {}
  return "ngrok";
}

function tunnelReady(domain) {
  if (!fs.existsSync(logFile)) return false;
  const log = fs.readFileSync(logFile, "utf8");
  return log.includes("started tunnel") && log.includes(domain);
}

function dockerDaemonOk() {
  try {
    // Timeout: a wedged daemon makes `docker info` hang forever, which used
    // to stall the script with zero output. Unresponsive counts as down.
    const r = spawnSync("docker", ["info"], { stdio: "ignore", shell: true, cwd: root, timeout: 15000 });
    return r.status === 0;
  } catch {
    return false;
  }
}

// True when the compose service already has a local image (so `up` needs no
// `--build`). Any failure means "not built" - a first-ever run then builds
// automatically instead of failing on a missing image.
function imageBuilt(service) {
  try {
    const r = spawnSync("docker", ["compose", "images", service, "-q"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      cwd: root,
    });
    return r.status === 0 && (r.stdout || "").trim().length > 0;
  } catch {
    return false;
  }
}

function openDockerDesktop() {
  if (process.platform !== "win32") return false;
  const exe = path.join(
    process.env.ProgramFiles || "C:\\Program Files",
    "Docker",
    "Docker",
    "Docker Desktop.exe"
  );
  try {
    spawn(`"${exe}"`, [], { detached: true, stdio: "ignore", shell: true, cwd: root }).unref();
    return true;
  } catch {
    return false;
  }
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
  // AbortController: if the booting container accepts the TCP connection but
  // never replies (Caddy/FrankenPHP mid-composer/mid-build), Node's fetch hangs
  // forever — which stalls waitFor's loop past its 600s budget. A short timeout
  // makes each poll resolve so the retry loop actually advances.
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

// Images this script is allowed to terminate: the Vite dev server (plain
// node, no shell wrapper) and the ngrok tunnel. Anything else — notably a
// terminal shell — is never a valid kill target.
const OWNED_IMAGES = new Set(["node.exe", "ngrok.exe"]);

function imageOf(pid) {
  try {
    const r = spawnSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const m = /"([^"]+)"/.exec(r.stdout || "");
    return m ? m[1].toLowerCase() : "";
  } catch {
    return "";
  }
}

// Single-instance guard: refuses to start while another ngrok.js run is
// alive, so two runs can never share a console and double every cleanup
// line. Crash-safe: a stale pid file (dead PID / different command line)
// is ignored and overwritten.
function liveNgrokPid() {
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
      // Timeout: WMI hangs for minutes on a stressed box and this runs before
      // the first log line (silent stall). Fail open — a stale pid file is
      // simply overwritten.
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
    if (cmdline.includes("ngrok.js") && !cmdline.includes("ngrok-build")) return pid;
  } catch {}
  return 0;
}

function killTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    try {
      // Never kill blind: verify the PID still belongs to one of our own
      // child images first, so a stale/wrong PID can never take down the
      // terminal shell (or anything else we don't own).
      if (!OWNED_IMAGES.has(imageOf(pid))) return;
      spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore" });
    } catch {}
  } else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  }
}

// Fixed-width dotted status lines, e.g.
// `[ngrok] Docker stack .................. UP`.
const STATUS_WIDTH = 30;
function statusLine(label, status) {
  const dots = ".".repeat(Math.max(2, STATUS_WIDTH - label.length));
  console.log(`[ngrok] ${label} ${dots} ${status}`);
}

function elapsedSec(t0) {
  return Math.round((Date.now() - t0) / 1000);
}

// Vite-style colors for the live URL table (raw ANSI codes: no new deps).
// Auto-disabled when piped or NO_COLOR is set, like Vite/picocolors.
const useColor = Boolean(process.stdout.isTTY) && !process.env.NO_COLOR;
function paint(codes, s) {
  return useColor ? `\x1b[${codes}m${s}\x1b[0m` : s;
}
const cyan = (s) => paint(36, s);
const green = (s) => paint(32, s);
const greenBold = (s) => paint("32;1", s);
const dim = (s) => paint(2, s);

// Exit-path output MUST be written synchronously. `console.log` buffers
// asynchronously when stdout is a pipe (npm -> shell), and process.exit()
// can truncate or reorder still-pending writes. writeSync blocks until the
// bytes hit the console, so cleanup messages are guaranteed to reach the
// terminal before the process exits - not after, and not fabricated delays.
function exitLog(line = "") {
  try { fs.writeSync(1, line + "\n"); } catch {}
}

// Best-effort native-postgres guard (Herd path only): create DB_DATABASE if
// missing, since `migrate:fresh` never creates it. Never fatal; the backend
// wait is authoritative. Docker paths never call this (POSTGRES_DB auto-creates).
function ensureDatabase() {
  // Single argv to `php -r` (no shell): double quotes only inside, so the
  // JS single-quoted string needs no escaping except \\n.
  const code =
    '$h=getenv("DB_HOST");$h=$h?$h:"127.0.0.1";' +
    '$p=getenv("DB_PORT");$p=$p?$p:"5432";' +
    '$d=getenv("DB_DATABASE");$d=$d?$d:"server_monitoring";' +
    '$u=getenv("DB_USERNAME");$u=$u?$u:"postgres";' +
    '$w=getenv("DB_PASSWORD");$w=$w===false?"":$w;' +
    'try{$c=new PDO("pgsql:host=$h;port=$p;dbname=postgres",$u,$w);' +
    '$c->setAttribute(PDO::ATTR_ERRMODE,PDO::ERRMODE_EXCEPTION);' +
    '$c->exec("CREATE DATABASE ".chr(34).str_replace(chr(34),chr(34).chr(34),$d).chr(34));' +
    'echo "[ngrok] Created database $d - run `npm run resetdb` to migrate, then re-run.\\n";exit(0);}' +
    'catch(PDOException $e){if(stripos($e->getMessage(),"already exists")!==false)' +
    '{echo "[ngrok] Database $d exists.\\n";exit(0);}' +
    'echo "[ngrok] WARNING: could not ensure database $d (".$e->getMessage().") - continuing.\\n";exit(0);}';
  try {
    const r = spawnSync("php", ["-r", code], { encoding: "utf8", cwd: root });
    if (r.error) throw r.error;
    if (r.stdout) process.stdout.write(r.stdout);
  } catch {
    console.log("[ngrok] WARNING: could not ensure the database (`php` unavailable) - continuing.");
  }
}

let domain = "";
let upstream = "";
let tunnelUrl = "";
// Previous .env lines overwritten for a Herd run (Docker runs never touch
// the file). Restored in cleanup() so tunnel run-state never leaks into
// later plain runs. Null = the line did not exist before.
let prevAppUrlLine = null;
let prevSkipLine = null;
let envFileTouched = false;

async function main() {
  // Load environment from .env.development + .env (gitignored overrides win).
  loadEnvIntoProcess([".env.development", ".env"]);

  // `npm run ngrok rebuild`: Dockerfile changes don't apply to a running image;
  // --build recreates images from the current Dockerfile before the stack starts.
  const cliArgs = process.argv.slice(2);
  // `npm run docker` reuses this runner with no tunnel (no domain, no ngrok binary).
  const useTunnel = !cliArgs.includes("docker");
  const doRebuild = cliArgs.includes("rebuild");

  domain = process.env.NGROK_DOMAIN;
  upstream = (process.env.NGROK_UPSTREAM || "").replace(/\/+$/, "");

  if (!useTunnel) {
    // No tunnel: the backend is always the local Docker app; no reserved domain needed.
    upstream = "http://127.0.0.1:8000";
  }

  if (useTunnel && !domain) {
    console.error("[ngrok] ERROR: NGROK_DOMAIN environment variable is required");
    console.error("[ngrok] Add NGROK_DOMAIN=your-reserved.ngrok-free.dev to your .env");
    process.exit(1);
  }

  if (!upstream) {
    console.error("[ngrok] ERROR: NGROK_UPSTREAM environment variable is required");
    console.error("[ngrok] Add NGROK_UPSTREAM=http://127.0.0.1:8000 to your .env (Docker) or NGROK_UPSTREAM=http://server-monitoring-system.test (Herd)");
    process.exit(1);
  }

  const otherNgrok = liveNgrokPid();
  if (otherNgrok) {
    console.error(`[ngrok] Another ngrok.js run is already active (PID ${otherNgrok}). From the repo root, paste this to stop it and clear the lock:`);
    console.error(`[ngrok]   Stop-Process -Id ${otherNgrok} -Force -ErrorAction SilentlyContinue; Remove-Item .\\.ngrok.pid -Force -ErrorAction SilentlyContinue`);
    process.exit(1);
  }
  try { fs.writeFileSync(pidFile, String(process.pid)); } catch {}

  if (useTunnel) {
    tunnelUrl = `https://${domain}`;
    // Always in memory BEFORE `docker compose up`: ${APP_URL} interpolation in
    // compose.yaml bakes the tunnel URL into the app container as real env
    // (createImmutable: real env beats the bind-mounted .env file, which is
    // why the .env write alone never reached ProvisioningService).
    process.env.APP_URL = tunnelUrl;
    // Lets generated agent install commands bypass ngrok's free-tier browser
    // interstitial. compose.yaml interpolates this into the app container;
    // the .env write below covers Herd only. Never set in prod (pinned false).
    process.env.NGROK_SKIP_BROWSER_WARNING = "true";
  } else {
    // No tunnel: provision/install URLs point at the local Docker app.
    process.env.APP_URL = upstream;
  }
  const isDockerUpstream = /127\.0\.0\.1:8000|localhost:8000/.test(upstream);

  // Track spawned children from here so Ctrl+C cleans up even mid-build
  // (docker up, backend wait, tunnel wait) — handlers register BEFORE any
  // phase that can block, not at the end of main().
  let ngrokChild = null;
  let viteChild = null;
  let docsChild = null;
  let cleanedUp = false;
  function cleanup() {
    if (cleanedUp) return;
    cleanedUp = true;
    try { fs.unlinkSync(pidFile); } catch {}
    exitLog(useTunnel ? "\n[ngrok] Stopping tunnel and dev server..." : "\n[ngrok] Stopping dev server...");
    killTree(ngrokChild?.pid);
    killTree(viteChild?.pid);
    killTree(docsChild?.pid);
    if (isDockerUpstream) {
      // `stop`, never `down`: containers keep their volumes/images so the
      // next run restarts in seconds, but RAM goes back to zero now.
      // Blocking spawnSync: docker fully finishes before we return (a prompt
      // printed mid-cleanup is the parent shell's own Ctrl+C echo, which
      // Windows delivers to every attached process — not an early exit).
      exitLog("[ngrok] Stopping docker stack (containers kept, data safe)...");
      try {
        // ponytail: stdio ignore — matches iYu dev.mjs. "inherit" let docker's
        // progress stream to the shared console AFTER PowerShell already
        // printed its Ctrl+C prompt, interleaving output (the race below).
        // Ignoring docker's stdout keeps cleanup silent so the prompt order is
        // clean. No shell: true — cmd.exe intermediary on Windows intercepts
        // SIGINT during the blocking stop and kills the parent shell.
        spawnSync("docker", ["compose", "stop"], { stdio: "ignore", cwd: root });
      } catch {}
    } else if (envFileTouched) {
      // Herd only: put .env back the way we found it (sync I/O is safe in
      // exit handlers; only async work is banned there). Runs on
      // SIGINT/SIGTERM/normal exit — not on hard kill, which skips cleanup.
      try {
        let content = fs.readFileSync(envPath, "utf8");
        content = restoreEnvLine(content, "APP_URL", prevAppUrlLine);
        content = restoreEnvLine(content, "NGROK_SKIP_BROWSER_WARNING", prevSkipLine);
        fs.writeFileSync(envPath, content);
        exitLog("[ngrok] Restored .env tunnel values.");
      } catch {}
    }
    exitLog("");
    exitLog("[ngrok] Cleanup complete — safe to type.");
  }

  process.stdin.resume();

  process.on("SIGINT", () => {
    exitLog("\n[ngrok] Interrupted — cleaning up...");
    cleanup();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    cleanup();
    process.exit(0);
  });
  process.on("exit", () => {
    cleanup();
  });

  // 1. Point the backend at the tunnel URL.
  // Docker: memory-only (process.env above flows through compose.yaml
  // interpolation into the recreated container). Nothing is written, so a
  // later plain `docker compose up` self-heals to localhost:8000.
  // Herd: the .env file is the only channel into the separate Herd PHP
  // process tree — write it, snapshot the previous lines, restore on exit.
  if (!isDockerUpstream) {
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
  }

  // 2. Ensure the backend behind the proxy is actually running.
  if (isDockerUpstream) {
    if (!dockerDaemonOk()) {
      console.log("[ngrok] Docker Desktop is not running — opening it...");
      if (!openDockerDesktop()) {
        console.error("[ngrok] Could not open Docker Desktop automatically. Start it manually, then re-run.");
        process.exit(1);
      }
      const daemonUp = await waitFor(
        () => dockerDaemonOk(),
        120,
        1000,
        (s) => { if (s % 15 === 0) console.log(`[ngrok] Still waiting for Docker Desktop... (${s}s elapsed)`); }
      );
      if (!daemonUp) {
        console.error("[ngrok] Docker Desktop did not start within 120s. Start it manually, then re-run.");
        process.exit(1);
      }
    }
    statusLine("Docker daemon", green("RUNNING"));
    console.log("");
    console.log("[ngrok] Bringing docker stack up (app serves :8000)...");
    // Stream compose output: per-service lines show realtime startup/status.
    // Auto-build on first run (missing app image) and whenever build inputs
    // went stale (Dockerfile/lockfiles); `rebuild` forces it every time.
    const stale = isDockerStale(root);
    const needsBuild = doRebuild || !imageBuilt("app") || stale;
    if (needsBuild && !doRebuild) {
      console.log(
        stale
          ? "[ngrok] Docker build inputs changed - rebuilding images..."
          : "[ngrok] App image not found - building it first (one-time)..."
      );
    }
    const upArgs = ["compose", "up", "-d"];
    if (needsBuild) upArgs.push("--build");
    const docker = spawnSync("docker", upArgs, {
      stdio: "inherit",
      shell: true,
      cwd: root,
    });
    if (docker.status !== 0) {
      console.error("[ngrok] docker compose up failed.");
      process.exit(1);
    }
    if (needsBuild) markDockerFresh(root);
    statusLine("Docker stack", green("UP"));
    console.log("");
    console.log("[ngrok] Waiting for the Docker app on :8000 (cold boot runs composer + migrate, can take minutes)...");
    const backendT0 = Date.now();
    const appUp = await waitFor(
      () => httpOk("http://127.0.0.1:8000/api/health"),
      600,
      1000,
      (s) => { if (s % 15 === 0) console.log(`[ngrok] Still waiting for backend... (${s}s elapsed)`); }
    );
    if (!appUp) {
      console.error("[ngrok] Nothing is serving http://127.0.0.1:8000/api/health after 600s.");
      console.error("[ngrok] Check `docker compose ps` and `docker compose logs app`.");
      process.exit(1);
    }
    statusLine("Backend :8000", green(`READY (${elapsedSec(backendT0)}s)`));
    console.log("");
  } else {
    console.log(`[ngrok] Using Herd backend at ${upstream} - make sure Herd is running.`);
    // Native postgres only: ensure the database exists before waiting on it.
    ensureDatabase();
    const herdUp = await waitFor(() => httpOk(`${upstream}/api/health`), 15, 1000);
    if (!herdUp) {
      console.error(`[ngrok] Backend at ${upstream} is not responding. Start Herd, then re-run.`);
      process.exit(1);
    }
    statusLine("Herd backend", green("REACHABLE"));
    console.log("");
    console.log("[ngrok] Restart Herd site/PHP so web workers pick up the new APP_URL from .env,");
    console.log("[ngrok] then regenerate the provision token in the dashboard.");
    console.log("");
  }

  // 3. Env for the Vite dev server (HMR host + Reverb).
  process.env.NGROK_UPSTREAM = upstream;
  // Tells the spawned Vite where to proxy /api + /sanctum (+ agent paths).
  // A dedicated var (not NGROK_UPSTREAM) so plain `npm run dev` - which also
  // loads .env - keeps proxying to Herd instead of a dead :8000.
  process.env.VITE_BACKEND_URL = upstream;
  if (useTunnel) {
    // Reverb reaches the browser through the tunnel (wss over 443).
    process.env.NGROK_DOMAIN = domain;
    process.env.VITE_REVERB_HOST = domain;
    process.env.VITE_REVERB_PORT = "443";
    process.env.VITE_REVERB_SCHEME = "https";
    // Settings links docs via VITE_DOCS_URL — point it at the tunnel so it
    // resolves through the frontend /docs proxy instead of dead localhost.
    process.env.VITE_DOCS_URL = tunnelUrl;
  }
  // Docker mode: VITE_REVERB_* keep the loaded .env.development defaults
  // (127.0.0.1:8081 over plain ws), which is exactly the local Docker Reverb.

  // 4. Start Vite dev server for frontend (with HMR). Run node directly
  // on the Vite bin with no shell: an npm.cmd/shell wrapper is a cmd.exe
  // batch process, and cmd.exe prints "Terminate batch job (Y/N)?" and
  // hangs on Ctrl+C. Plain node exits cleanly instead.
  console.log("[ngrok] Starting Vite dev server (with HMR)...");
  viteChild = spawn(process.execPath, [viteBin], {
    stdio: "inherit",
    windowsHide: true,
    cwd: path.join(root, "frontend"),
    env: { ...process.env },
  });
  viteChild.on("error", (err) => {
    console.error(`[ngrok] Failed to start Vite: ${err.message}`);
    cleanup();
    process.exit(1);
  });

  // Gate the tunnel on Vite actually answering, so the smoke test never
  // races the first compile.
  console.log("[ngrok] Waiting for the Vite dev server...");
  const viteT0 = Date.now();
  const viteUp = await waitFor(() => httpOk("http://127.0.0.1:5173/"), 60, 1000);
  if (!viteUp) {
    console.error("[ngrok] Vite dev server did not respond on :5173 within 60s.");
    cleanup();
    process.exit(1);
  }
  statusLine("Vite dev server", green(`READY (${elapsedSec(viteT0)}s)`));
  console.log("");

  // Docs dev server (:5174), reached through the frontend /docs proxy.
  // Same spawn shape as Vite above: plain node, no shell wrapper.
  console.log("[ngrok] Starting docs dev server...");
  docsChild = spawn(process.execPath, [viteBin], {
    stdio: "inherit",
    windowsHide: true,
    cwd: path.join(root, "docs"),
    env: { ...process.env },
  });
  docsChild.on("error", (err) => {
    console.error(`[ngrok] Failed to start docs: ${err.message}`);
    cleanup();
    process.exit(1);
  });

  console.log("[ngrok] Waiting for the docs dev server...");
  const docsT0 = Date.now();
  const docsUp = await waitFor(() => httpOk("http://127.0.0.1:5174/docs/"), 60, 1000);
  if (!docsUp) {
    console.error("[ngrok] Docs dev server did not respond on :5174 within 60s.");
    cleanup();
    process.exit(1);
  }
  statusLine("Docs dev server", green(`READY (${elapsedSec(docsT0)}s)`));
  console.log("");

  if (!useTunnel) {
    // `npm run docker`: local Docker dev with HMR. No tunnel, no public URL.
    console.log(dim("========================================"));
    console.log(`  ${greenBold("docker dev is live (HMR mode, no tunnel)")}`);
    console.log(`  ${dim("➜")}  App:     ${cyan(upstream)}`);
    console.log(`  ${dim("➜")}  API:     ${cyan(`${upstream}/api`)}`);
    console.log(`  ${dim("➜")}  Docs:    ${cyan("http://127.0.0.1:5173/docs")}`);
    console.log(`  ${dim("➜")}  Backend: ${cyan(upstream)}`);
    console.log(dim("========================================"));
    console.log("");
    console.log("[ngrok] Press Ctrl+C to stop dev server and docker stack.");
    return;
  }

  // 5. Start ngrok tunnel to Vite (port 5173).
  console.log("[ngrok] Starting ngrok tunnel to Vite (port 5173)...");
  let listener = null;
  const authtoken = getNgrokAuthtoken();
  try {
    const ngrokSdk = await import("@ngrok/ngrok");
    listener = await ngrokSdk.forward({
      addr: 5173,
      domain: domain,
      ...(authtoken ? { authtoken } : { authtoken_from_env: true }),
    });
  } catch (sdkErr) {
    try { fs.unlinkSync(logFile); } catch {}
    const args = ["http", "5173", `--domain=${domain}`, `--log=${logFile}`, "--log-format=json"];
    ngrokChild = spawn(findNgrok(), args, { stdio: "ignore", windowsHide: true, cwd: root });
    ngrokChild.on("error", (err) => {
      console.error(`[ngrok] Failed to start: ${sdkErr.message || err.message}`);
      cleanup();
      process.exit(1);
    });
    ngrokChild.unref();

    const ready = await waitFor(() => tunnelReady(domain), 20, 1000);
    if (!ready) {
      console.error("[ngrok] Tunnel did not come up. Check .ngrok.log");
      cleanup();
      process.exit(1);
    }
  }

  if (listener) {
    const prevCleanup = cleanup;
    cleanup = function() {
      try { listener.close(); } catch {}
      prevCleanup();
    };
  }

  statusLine("Tunnel", green("LIVE"));

  console.log("");
  console.log(dim("========================================"));
  console.log(`  ${greenBold("ngrok tunnel is live (HMR mode)")}`);
  console.log(`  ${dim("➜")}  URL:     ${cyan(tunnelUrl)}`);
  console.log(`  ${dim("➜")}  API:     ${cyan(`${tunnelUrl}/api`)}`);
  console.log(`  ${dim("➜")}  Docs:    ${cyan(`${tunnelUrl}/docs`)}`);
  console.log(`  ${dim("➜")}  Backend: ${cyan(upstream)}`);
  console.log(dim("========================================"));
  console.log("");

  // 6. Smoke-test the public URL.
  console.log("[ngrok] Smoke-testing the public URL...");
  const connected = await waitFor(
    () => httpOk(tunnelUrl),
    30,
    1000,
    (s) => { if (s % 10 === 0) console.log(`[ngrok] Still waiting for tunnel response... (${s}s elapsed)`); }
  );
  if (connected) {
    statusLine("Smoke test", green("200 OK"));
  } else {
    console.log("[ngrok] Could not verify connection after 30s. Check .ngrok.log and Vite output.");
  }

  console.log("[ngrok] Press Ctrl+C to stop tunnel, dev server, and docker stack.");
}

main().catch((err) => {
  console.error("[ngrok] Failed:", err.message);
  process.exit(1);
});
