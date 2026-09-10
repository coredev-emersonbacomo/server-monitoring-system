#!/usr/bin/env node
// npm run docker:clean - reset to a known-good Docker state WITHOUT data loss:
// kills orphaned ngrok.js runners, clears the pid lock, stops the stack
// (containers kept, volumes/images untouched), and restarts the Docker
// Desktop engine. Opt-in only — never runs as part of docker/ngrok startup.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn, spawnSync } from "child_process";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function sh(cmd, args, opts = {}) {
    try {
        return spawnSync(cmd, args, {
            encoding: "utf8",
            stdio: ["ignore", "pipe", "ignore"],
            cwd: root,
            timeout: 30000,
            ...opts,
        });
    } catch {
        return { status: 1, stdout: "" };
    }
}

function daemonOk() {
    const r = sh("docker", ["info"], { stdio: "ignore", timeout: 10000 });
    return r.status === 0;
}

// PIDs of live node processes running our own runners (never self).
function orphanRunnerPids() {
    if (process.platform !== "win32") return [];
    const r = sh("powershell", ["-NoProfile", "-Command",
        "Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | " +
        "Where-Object { $_.CommandLine -like '*scripts/ngrok*.js*' } | " +
        "ForEach-Object { $_.ProcessId }"], { timeout: 15000 });
    if (r.status !== 0) return [];
    return (r.stdout || "").split(/\s+/).map(Number)
        .filter((p) => Number.isInteger(p) && p > 0 && p !== process.pid);
}

async function main() {
    // 1. Orphaned runners from Ctrl+C'd terminals.
    for (const pid of orphanRunnerPids()) {
        console.log(`[clean] Stopping orphaned runner (PID ${pid})...`);
        sh("powershell", ["-NoProfile", "-Command",
            `Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue`], { timeout: 15000 });
    }

    // 2. Stale pid lock.
    try { fs.unlinkSync(path.join(root, ".ngrok.pid")); } catch {}
    console.log("[clean] Pid lock cleared.");

    // 3. Stop the stack (kept, not removed — volumes and data are safe).
    console.log("[clean] Stopping docker stack (containers kept, data safe)...");
    sh("docker", ["compose", "stop"], { stdio: "inherit", timeout: 120000 });

    // 4. Engine restart (Windows only — elsewhere print the manual step).
    if (process.platform !== "win32") {
        console.log("[clean] Non-Windows: restart the Docker engine manually, then re-run.");
        return;
    }
    console.log("[clean] Restarting Docker Desktop engine...");
    sh("powershell", ["-NoProfile", "-Command",
        'Stop-Process -Name "Docker Desktop" -Force -ErrorAction SilentlyContinue'], { timeout: 15000 });
    sh("wsl", ["--shutdown"], { timeout: 60000 });
    const exe = path.join(process.env.ProgramFiles || "C:\\Program Files", "Docker", "Docker", "Docker Desktop.exe");
    try {
        spawn(`"${exe}"`, [], { detached: true, stdio: "ignore", shell: true, cwd: root }).unref();
    } catch {
        console.error("[clean] Could not start Docker Desktop automatically — start it from the Start menu.");
        process.exit(1);
    }

    console.log("[clean] Waiting for the engine (up to 180s)...");
    const t0 = Date.now();
    for (let i = 0; i < 180; i++) {
        if (daemonOk()) {
            console.log(`[clean] Engine UP (${Math.round((Date.now() - t0) / 1000)}s) — re-run npm run docker / ngrok.`);
            return;
        }
        if (i % 15 === 0 && i > 0) console.log(`[clean] Still waiting... (${i}s elapsed)`);
        await new Promise((r) => setTimeout(r, 1000));
    }
    console.error("[clean] Engine did not come up in 180s — check Docker Desktop manually.");
    process.exit(1);
}

main().catch((err) => {
    console.error(`[clean] ${err?.message ?? err}`);
    process.exit(1);
});
