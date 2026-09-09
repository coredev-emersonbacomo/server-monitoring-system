#!/usr/bin/env node
// npm run docker — local Docker dev flow: Docker app + Vite HMR (no ngrok tunnel).
// Architecture:
//   Vite :5173 (HMR WebSocket)  →  Laravel API (Docker app :8000, never exposed)
//
// Configure in your gitignored .env:
//   NGROK_UPSTREAM=http://127.0.0.1:8000  (Docker app)
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, spawnSync } from "child_process";
import { loadEnvIntoProcess } from "./load-env.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pidFile = path.join(root, ".docker.pid");
const viteBin = fs.existsSync(path.join(root, "frontend", "node_modules", "vite", "bin", "vite.js"))
  ? path.join(root, "frontend", "node_modules", "vite", "bin", "vite.js")
  : path.join(root, "node_modules", "vite", "bin", "vite.js");

// Images this script is allowed to terminate: the Vite dev server (plain node).
// Anything else — notably a terminal shell — is never a valid kill target.
const OWNED_IMAGES = new Set(["node.exe"]);

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

function killTree(pid) {
  if (!pid) return;
  if (process.platform === "win32") {
    try {
      // Never kill blind: verify the PID still belongs to one of our own
      // child images first, so a stale/wrong PID can never take down the
      // terminal shell (or anything else we don't own).
      if (!OWNED_IMAGES.has(imageOf(pid))) return;
      spawnSync("taskkill", ["/id", String(pid), "/T", "/F"], { stdio: "ignore" });
    } catch {}
  } else {
    try {
      process.kill(pid, "SIGTERM");
    } catch {}
  }
}

// Single-instance guard: refuses to start while another docker.js run is
// alive, so two runs can never share a console and double every cleanup
// line. Crash-safe: a stale pid file (dead PID / different command line)
// is ignored and overwritten.
function liveDockerPid() {
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
      });
      cmdline = r.status === 0 ? r.stdout || "" : "";
    } else {
      const r = spawnSync("ps", ["-p", String(pid), "-o", "args="], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      cmdline = r.status === 0 ? r.stdout || "" : "";
    }
    if (cmdline.includes("docker.js")) return pid;
  } catch {}
  return 0;
}

function dockerDaemonOk() {
  try {
    const r = spawnSync("docker", ["info"], { stdio: "ignore", shell: true, cwd: root });
    return r.status === 0;
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

const STATUS_WIDTH = 30;
function statusLine(label, status) {
  const dots = ".".repeat(Math.max(2, STATUS_WIDTH - label.length));
  console.log(`[docker] ${label} ${dots} ${status}`);
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

let viteChild = null;
let cleanedUp = false;

function cleanup() {
  if (cleanedUp) return;
  cleanedUp = true;
  try { fs.unlinkSync(pidFile); } catch {}
  exitLog("\n[docker] Stopping dev server and docker stack...");
  killTree(viteChild?.pid);
  // `stop`, never `down`: containers keep their volumes/images so the
  // next run restarts in seconds, but RAM goes back to zero now.
  exitLog("[docker] Stopping docker stack (containers kept, data safe)...");
  try {
    // No shell: true — cmd.exe intermediary on Windows intercepts SIGINT
    // during the blocking stop and kills the parent shell.
    spawnSync("docker", ["compose", "stop"], { stdio: "ignore", cwd: root });
  } catch {}
  exitLog("");
  exitLog("[docker] Cleanup complete — safe to type.");
}

async function main() {
  loadEnvIntoProcess([".env.development", ".env"]);

  const otherDocker = liveDockerPid();
  if (otherDocker) {
    console.error(`[docker] Another docker.js run is already active (PID ${otherDocker}). Stop it first (Ctrl+C), then re-run.`);
    console.error("[docker] If no docker run is active, delete .docker.pid and re-run.");
    process.exit(1);
  }
  try { fs.writeFileSync(pidFile, String(process.pid)); } catch {}

  // Vite proxy target → Docker app on :8000.
  process.env.VITE_BACKEND_URL = "http://127.0.0.1:8000";

  // Register handlers before any blocking phase so Ctrl+C cleans up mid-build.
  process.stdin.resume();
  process.on("SIGINT", () => {
    exitLog("\n[docker] Interrupted — cleaning up...");
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

  const doRebuild = process.argv.slice(2).includes("rebuild");

  // 1. Ensure Docker daemon is up.
  if (!dockerDaemonOk()) {
    console.log("[docker] Docker Desktop is not running — opening it...");
    if (!openDockerDesktop()) {
      console.error("[docker] Could not open Docker Desktop automatically. Start it manually, then re-run.");
      process.exit(1);
    }
    const daemonUp = await waitFor(() => dockerDaemonOk(), 120, 1000);
    if (!daemonUp) {
      console.error("[docker] Docker Desktop did not start within 120s. Start it manually, then re-run.");
      process.exit(1);
    }
  }
  statusLine("Docker daemon", green("RUNNING"));
  console.log("");

  // 2. Bring Docker stack up (app serves :8000).
  console.log("[docker] Bringing docker stack up (app serves :8000)...");
  const upArgs = ["compose", "up", "-d"];
  if (doRebuild) upArgs.push("--build");
  const docker = spawnSync("docker", upArgs, {
    stdio: "inherit",
    shell: true,
    cwd: root,
  });
  if (docker.status !== 0) {
    console.error("[docker] docker compose up failed.");
    process.exit(1);
  }
  statusLine("Docker stack", green("UP"));
  console.log("");

  // 3. Wait for the backend.
  console.log("[docker] Waiting for the Docker app on :8000 (cold boot runs composer + migrate, can take minutes)...");
  const backendT0 = Date.now();
  const appUp = await waitFor(
    () => httpOk("http://127.0.0.1:8000/api/health"),
    600,
    1000,
    (s) => { if (s % 15 === 0) console.log(`[docker] Still waiting for backend... (${s}s elapsed)`); }
  );
  if (!appUp) {
    console.error("[docker] Nothing is serving http://127.0.0.1:8000/api/health after 600s.");
    console.error("[docker] Check `docker compose ps` and `docker compose logs app`.");
    cleanup();
    process.exit(1);
  }
  statusLine("Backend :8000", green(`READY (${elapsedSec(backendT0)}s)`));
  console.log("");

  // 4. Start Vite dev server for frontend (with HMR). No shell wrapper.
  console.log("[docker] Starting Vite dev server (with HMR)...");
  viteChild = spawn(process.execPath, [viteBin], {
    stdio: "inherit",
    windowsHide: true,
    cwd: path.join(root, "frontend"),
    env: { ...process.env },
  });
  viteChild.on("error", (err) => {
    console.error(`[docker] Failed to start Vite: ${err.message}`);
    cleanup();
    process.exit(1);
  });

  // Gate on Vite actually answering, so the ready message doesn't race first compile.
  console.log("[docker] Waiting for the Vite dev server...");
  const viteT0 = Date.now();
  const viteUp = await waitFor(() => httpOk("http://127.0.0.1:5173/"), 60, 1000);
  if (!viteUp) {
    console.error("[docker] Vite dev server did not respond on :5173 within 60s.");
    cleanup();
    process.exit(1);
  }
  statusLine("Vite dev server", green(`READY (${elapsedSec(viteT0)}s)`));
  console.log("");

  console.log(dim("========================================"));
  console.log(`  ${greenBold("Docker dev is live (HMR mode)")}`);
  console.log(`  ${dim("➜")}  Frontend: ${cyan("http://localhost:5173")}`);
  console.log(`  ${dim("➜")}  API:     ${cyan("http://127.0.0.1:8000/api")}`);
  console.log(dim("========================================"));
  console.log("");

  console.log("[docker] Press Ctrl+C to stop dev server and docker stack.");
}

main().catch((err) => {
  console.error("[docker] Failed:", err.message);
  process.exit(1);
});
