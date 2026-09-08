#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";
import { loadEnvIntoProcess } from "./load-env.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const logFile = path.join(root, ".tunnel.log");

function findCloudflared() {
  const candidates = [
    path.join(process.env.LOCALAPPDATA || "", "cloudflared.exe"),
    "cloudflared",
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return "cloudflared";
}

function stripHost(url) {
  return url.replace(/^https?:\/\//, "").split("/")[0];
}

function readTunnelUrl() {
  if (!fs.existsSync(logFile)) return null;
  const log = fs.readFileSync(logFile, "utf8");
  const match = log.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
  return match ? match[0] : null;
}

async function main() {
  loadEnvIntoProcess([".env.development", ".env"]);

  const cloudflared = findCloudflared();

  // Clear old log
  try { fs.unlinkSync(logFile); } catch {}

  // Start cloudflared quick tunnel (random *.trycloudflare.com URL).
  const logFd = fs.openSync(logFile, "w");
  const child = spawn(
    cloudflared,
    ["tunnel", "--url", "http://127.0.0.1:80", "--http-host-header", "server-monitoring-system.test"],
    {
      stdio: ["ignore", "ignore", logFd],
      windowsHide: true,
    }
  );

  fs.closeSync(logFd);
  child.unref();

  // Parse the random URL from the log (up to 15s).
  let tunnelUrl = null;
  for (let i = 0; i < 15; i++) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    tunnelUrl = readTunnelUrl();
    if (tunnelUrl) break;
  }

  if (!tunnelUrl) {
    console.error("[tunnel] Failed to get tunnel URL. Check .tunnel.log");
    child.kill();
    process.exit(1);
  }

  const host = stripHost(tunnelUrl);

  // Override env vars for Laravel backend services.
  // Load .env.development so VITE_REVERB_APP_KEY (and friends) are available.
  loadEnvIntoProcess(['.env.development', '.env']);
  process.env.APP_URL = tunnelUrl;
  process.env.VITE_REVERB_HOST = host;
  process.env.VITE_REVERB_PORT = "443";
  process.env.VITE_REVERB_SCHEME = "https";

  // Write APP_URL to .env so Laravel (which reads files, not Node env)
  // generates provision/install commands with the tunnel URL.
  const envPath = path.join(root, ".env");
  let envContent = "";
  try { envContent = fs.readFileSync(envPath, "utf8"); } catch {}
  if (envContent.match(/^APP_URL=.*$/m)) {
    envContent = envContent.replace(/^APP_URL=.*$/m, `APP_URL=${tunnelUrl}`);
  } else {
    envContent += (envContent.endsWith("\n") || !envContent ? "" : "\n") + `APP_URL=${tunnelUrl}\n`;
  }
  fs.writeFileSync(envPath, envContent);

  // Start entry.js prod — it builds, deploys, starts redis + workers.
  console.log("[tunnel] Building and deploying...");
  const entry = spawn(process.execPath, [path.join(root, "scripts", "entry.js"), "prod"], {
    stdio: "inherit",
    env: process.env,
    cwd: root,
  });
  entry.on('error', (err) => console.error(`[tunnel] entry.js spawn failed: ${err.message}`));

  // Wait for entry.js to finish building (deploySPA writes manifest.json last).
  // Poll until manifest mtime is newer than tunnel start, or timeout after 120s.
  const tunnelStart = Date.now();
  const manifest = path.join(root, "public", "build", "manifest.json");
  while (Date.now() - tunnelStart < 120000) {
    try {
      if (fs.statSync(manifest).mtimeMs > tunnelStart) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("");
  console.log("========================================");
  console.log(`  Backend : ${tunnelUrl}`);
  console.log(`  API     : ${tunnelUrl}/api`);
  console.log("========================================");
  console.log("");

  // Compare what Laravel resolves for app.url (CLI) vs the tunnel URL.
  // If Herd's web workers are stale they'll serve the old URL in provision
  // commands even though files + CLI are correct.
  const herdPhp = process.env.USERPROFILE
    ? [
        path.join(process.env.USERPROFILE, '.config', 'herd', 'bin', 'php84', 'php.exe'),
        path.join(process.env.USERPROFILE, '.config', 'herd', 'bin', 'php83', 'php.exe'),
        path.join(process.env.USERPROFILE, '.config', 'herd', 'bin', 'php82', 'php.exe'),
      ].find((p) => fs.existsSync(p))
    : null;
  const php = (process.env.PHP_BINARY && fs.existsSync(process.env.PHP_BINARY))
    ? process.env.PHP_BINARY
    : (fs.existsSync('C:\\tools\\php85\\php.exe')
        ? 'C:\\tools\\php85\\php.exe'
        : (herdPhp || 'php'));
  const appUrl = spawnSync(php, ["artisan", "tinker", "--execute=echo config('app.url');"], {
    cwd: root,
    encoding: "utf8",
    windowsHide: true,
  });
  const laravelUrl = (appUrl.stdout || "").trim().split("\n").pop();
  if (laravelUrl && laravelUrl !== tunnelUrl) {
    console.log(`[tunnel] WARNING: Laravel app.url (${laravelUrl}) != tunnel (${tunnelUrl})`);
    console.log(`[tunnel] Restart Herd site/PHP so web workers pick up the new APP_URL from .env,`);
    console.log(`[tunnel] then regenerate provision tokens.`);
  } else if (laravelUrl) {
    console.log(`[tunnel] Laravel app.url matches tunnel.`);
  }

  console.log("[tunnel] Testing connection...");
  try {
    const res = await fetch(tunnelUrl, { redirect: "follow", cache: "no-store" });
    console.log(`[tunnel] Test: ${res.status} ${res.statusText}`);

    // Check the built bundles for a real Pusher app key.
    // React SPA (public/assets/) uses VITE_REVERB_APP_KEY via useServerSocket.
    // Laravel Blade (public/build/) uses it via resources/js/echo.js.
    const html = await res.text();
    const bundles = [
      ...[...html.matchAll(/\/assets\/index-[^"]+\.js/g)].map(m => tunnelUrl + m[0]),
      ...[...html.matchAll(/\/build\/assets\/app-[^"]+\.js/g)].map(m => tunnelUrl + m[0]),
    ];
    if (!bundles.length) {
      console.log(`[tunnel] Pusher key: could not find app bundle in HTML`);
    }
    for (const jsUrl of bundles) {
      const js = await (await fetch(jsUrl, { cache: "no-store" })).text();
      const short = jsUrl.split('/').pop();
      // Match Echo instantiation: broadcaster:"reverb",key:"..."
      // or broadcaster:`reverb`,key:`...` (both quote styles)
      const echo = js.match(/broadcaster:(?:"reverb"|`reverb`),key:(?:"([^"]*)"|`([^`]*)`|void 0)/);
      if (echo) {
        const key = echo[1] ?? echo[2];
        if (key) {
          console.log(`[tunnel] Pusher key in ${short}: OK (${key.slice(0, 6)}...)`);
        } else {
          console.error(`[tunnel] Pusher key in ${short}: MISSING — VITE_REVERB_APP_KEY was empty at build time`);
        }
      } else {
        console.log(`[tunnel] Pusher key in ${short}: no Echo config found`);
      }
    }
  } catch (err) {
    console.error(`[tunnel] Test failed: ${err.message}`);
  }

  console.log("[tunnel] Press Ctrl+C to stop.");

  process.stdin.resume();

  process.on("SIGINT", () => {
    child.kill();
    entry.kill();
    process.exit();
  });
}

main().catch((err) => {
  console.error("[tunnel] Failed:", err.message);
  process.exit(1);
});
