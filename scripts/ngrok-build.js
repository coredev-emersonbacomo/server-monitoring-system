#!/usr/bin/env node
// npm run ngrok:build — Production build flow: docker stack + vite build + ngrok to Laravel :8000
// This is the original flow where frontend assets are built and served by Laravel.
// For development with HMR, use `npm run ngrok` instead.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, spawnSync, execSync } from "child_process";
import { loadEnvIntoProcess, restoreEnvLine } from "./load-env.js";
import { isDockerStale, markDockerFresh } from "./docker-build-state.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const logFile = path.join(root, ".ngrok.log");

// Reserved ngrok domain (stable URL) + upstream to expose. Both required,
// no hardcoded fallback — load .env files first, then validate in main().
let domain = "";
let upstream = "";
let tunnelUrl = "";

function findNgrok() {
  // NB: fs.existsSync lies about MS Store aliases (unstatable reparse
  // points) — detect via directory listing instead. Spawn resolves them.
  try {
    const dir = path.join(process.env.LOCALAPPDATA || "", "Microsoft", "WindowsApps");
    if (fs.readdirSync(dir).includes("ngrok.exe")) {
      return path.join(dir, "ngrok.exe");
    }
  } catch {}
  try {
    const found = execSync("where.exe ngrok", { encoding: "utf8" }).split(/\r?\n/)[0]?.trim();
    if (found) return found;
  } catch {}
  return "ngrok";
}

function tunnelReady() {
  if (!fs.existsSync(logFile)) return false;
  const log = fs.readFileSync(logFile, "utf8");
  return log.includes("started tunnel") && log.includes(domain);
}

async function main() {
  loadEnvIntoProcess([".env.development", ".env"]);

  domain = process.env.NGROK_DOMAIN;
  upstream = (process.env.NGROK_UPSTREAM || "").replace(/\/+$/, "");

  if (!domain) {
    console.error("[ngrok:build] ERROR: NGROK_DOMAIN environment variable is required");
    console.error("[ngrok:build] Add NGROK_DOMAIN=your-reserved.ngrok-free.dev to your .env");
    process.exit(1);
  }

  if (!upstream) {
    console.error("[ngrok:build] ERROR: NGROK_UPSTREAM environment variable is required");
    console.error("[ngrok:build] Add NGROK_UPSTREAM=http://127.0.0.1:8000 to your .env (Docker) or NGROK_UPSTREAM=http://server-monitoring-system.test (Herd)");
    process.exit(1);
  }

  tunnelUrl = `https://${domain}`;

  // In memory BEFORE `docker compose up`: ${APP_URL} interpolation bakes the
  // tunnel URL into the app container as real env (previously this assignment
  // sat after `up`, so the container only ever saw the stale .env value).
  process.env.APP_URL = tunnelUrl;
  const isDockerUpstream = /127\.0\.0\.1:8000|localhost:8000/.test(upstream);

  // 1. Docker stack up (postgres/redis/reverb/queue/scheduler/app).
  // Rebuild when build inputs went stale (Dockerfile/lockfiles); plain
  // `up` never rebuilds a stale image, and compose itself recreates
  // containers whose config changed.
  console.log("[ngrok:build] Bringing docker stack up...");
  const upArgs = ["compose", "up", "-d"];
  const staleBuild = isDockerStale(root);
  if (staleBuild) {
    console.log("[ngrok:build] Docker build inputs changed - rebuilding images...");
    upArgs.push("--build");
  }
  const docker = spawnSync("docker", upArgs, {
    stdio: "inherit",
    shell: true,
    cwd: root,
  });
  if (docker.status !== 0) {
    console.error("[ngrok:build] docker compose up failed — is Docker Desktop running?");
    process.exit(1);
  }
  if (staleBuild) markDockerFresh(root);

  // 2. Env overrides for the build (VITE_* baked into bundles).
  process.env.VITE_REVERB_HOST = domain;
  process.env.VITE_REVERB_PORT = "443";
  process.env.VITE_REVERB_SCHEME = "https";

  // 3. Herd only: .env is the only channel into the separate Herd PHP process
  // tree (snapshot + restore on exit). Docker is covered by the in-memory
  // APP_URL above, so nothing is written and a later plain
  // `docker compose up` self-heals to localhost:8000.
  const envPath = path.join(root, ".env");
  let prevAppUrlLine = null;
  let envFileTouched = false;
  if (!isDockerUpstream) {
    let envContent = "";
    try { envContent = fs.readFileSync(envPath, "utf8"); } catch {}
    prevAppUrlLine = envContent.match(/^APP_URL=.*$/m)?.[0] ?? null;
    if (envContent.match(/^APP_URL=.*$/m)) {
      envContent = envContent.replace(/^APP_URL=.*$/m, `APP_URL=${tunnelUrl}`);
    } else {
      envContent += (envContent.endsWith("\n") || !envContent ? "" : "\n") + `APP_URL=${tunnelUrl}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    envFileTouched = true;
  }

  // 4. Rebuild frontend + root Vite assets with ngrok vars.
  console.log("[ngrok:build] Building and deploying...");
  const { deploySPA } = await import("./deploy-spa.js");
  await deploySPA(root, fs);

  // 5. Start ngrok. Host policy only matters for Herd on :80 (Herd routes by
  // Host); the docker app ignores it, so skip the policy file there.
  try { fs.unlinkSync(logFile); } catch {}
  const args = ["http", upstream, `--url=https://${domain}`];
  if (/127\.0\.0\.1:80|localhost:80|server-monitoring-system\.test/.test(upstream)) {
    args.push("--traffic-policy-file", path.join(root, "scripts", "ngrok-policy.yml"));
  }
  args.push(`--log=${logFile}`, "--log-format=json");
  const child = spawn(findNgrok(), args, { stdio: "ignore", windowsHide: true, cwd: root });
  child.on("error", (err) => {
    console.error(`[ngrok:build] Failed to start: ${err.message}`);
    process.exit(1);
  });
  child.unref();

  // 6. Wait for tunnel link-up (up to 20s).
  let ready = false;
  for (let i = 0; i < 20; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (tunnelReady()) { ready = true; break; }
  }
  if (!ready) {
    console.error("[ngrok:build] Tunnel did not come up. Check .ngrok.log");
    child.kill();
    process.exit(1);
  }

  console.log("");
  console.log("========================================");
  console.log("  Backend : " + tunnelUrl);
  console.log("  API     : " + tunnelUrl + "/api");
  console.log("  Mode    : Build (no HMR)              ");
  console.log("========================================");
  console.log("");

  // 7. Test connection + Pusher key in built bundles.
  console.log("[ngrok:build] Testing connection...");
  try {
    const res = await fetch(tunnelUrl, { redirect: "follow", cache: "no-store" });
    console.log(`[ngrok:build] Test: ${res.status} ${res.statusText}`);

    const html = await res.text();
    const bundles = [
      ...[...html.matchAll(/\/assets\/index-[^"]+\.js/g)].map(m => tunnelUrl + m[0]),
      ...[...html.matchAll(/\/build\/assets\/app-[^"]+\.js/g)].map(m => tunnelUrl + m[0]),
    ];
    if (!bundles.length) {
      console.log("[ngrok:build] Pusher key: could not find app bundle in HTML");
    }
    for (const jsUrl of bundles) {
      const js = await (await fetch(jsUrl, { cache: "no-store" })).text();
      const short = jsUrl.split('/').pop();
      const echo = js.match(/broadcaster:(?:"reverb"|`reverb`),key:(?:"([^"]*)"|`([^`]*)`|void 0)/);
      if (echo) {
        const key = echo[1] ?? echo[2];
        if (key) {
          console.log(`[ngrok:build] Pusher key in ${short}: OK (${key.slice(0, 6)}...)`);
        } else {
          console.error(`[ngrok:build] Pusher key in ${short}: MISSING — VITE_REVERB_APP_KEY was empty at build time`);
        }
      } else {
        console.log(`[ngrok:build] Pusher key in ${short}: no Echo config found`);
      }
    }
  } catch (err) {
    console.error(`[ngrok:build] Test failed: ${err.message}`);
  }

  console.log("[ngrok:build] Press Ctrl+C to stop (docker stack stays up).");

  process.stdin.resume();

  process.on("SIGINT", () => {
    child.kill();
    if (envFileTouched) {
      try {
        let content = fs.readFileSync(envPath, "utf8");
        fs.writeFileSync(envPath, restoreEnvLine(content, "APP_URL", prevAppUrlLine));
        console.log("[ngrok:build] Restored .env APP_URL.");
      } catch {}
    }
    process.exit();
  });
}

main().catch((err) => {
  console.error("[ngrok:build] Failed:", err.message);
  process.exit(1);
});
