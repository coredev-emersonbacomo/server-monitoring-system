#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import net from 'net';
import { fileURLToPath } from 'url';
import { spawnSync, spawn } from 'child_process';
import concurrently from 'concurrently';
import { loadEnvIntoProcess } from './load-env.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

const ENV_FILES = {
  dev: '.env.development',
  prod: '.env.production',
};

const mode = process.argv[2];
if (!mode || !ENV_FILES[mode]) {
  console.error('Usage: node entry.js <dev|prod>');
  process.exit(1);
}

const source = path.join(root, ENV_FILES[mode]);
if (!fs.existsSync(source)) {
  console.error(`Missing ${ENV_FILES[mode]} — create it first`);
  process.exit(1);
}

// .env.production is gitignored, so .env.example is regenerated from the
// tracked .env.development on every run. Values are stripped so the example
// stays in sync with the real config without ever leaking secrets.
const devBase = fs.readFileSync(path.join(root, '.env.development'), 'utf8');
const example = devBase
  .split('\n')
  .map((line) => {
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#') || !line.includes('=')) {
      return line;
    }
    return line.replace(/=(.*)$/, '=');
  })
  .join('\n');
fs.writeFileSync(path.join(root, '.env.example'), example);
console.log('[entry] Regenerated .env.example from .env.development');

// Load env: dev uses .env.development, prod uses .env.production. .env
// overrides it (mirrors bootstrap/app.php load order).
loadEnvIntoProcess([ENV_FILES[mode], '.env']);

function logStatus() {
  if (String(process.env.MUTE_NOTIFICATION).toLowerCase() === 'true' || process.env.MUTE_NOTIFICATION === '1') {
    console.log('[entry] MUTE_NOTIFICATION=true — notifications muted (queue worker will log skipped sends)');
  }
  if (String(process.env.ALERTS_VISUAL_DEBUGGER).toLowerCase() === 'true' || process.env.ALERTS_VISUAL_DEBUGGER === '1') {
    console.log('[entry] ALERTS_VISUAL_DEBUGGER=true — alert visual debugger enabled (backend telemetry + /settings/alerts/debugger)');
  }
}

logStatus();

const php = 'C:\\tools\\php85\\php.exe';

// Recompile/drop the Laravel config cache so the swapped .env takes effect.
// Avoid optimize:clear — its cache:clear step needs Redis, which starts later.
  spawnSync(php, ['artisan', 'config:clear'], { stdio: 'ignore', windowsHide: true });

// --- Prod-only: warnings and SPA deploy ---
if (mode === 'prod') {
  const muteNotif = process.env.MUTE_NOTIFICATION?.toLowerCase();
  if (muteNotif === 'true' || muteNotif === '1') {
    console.log('[entry] WARNING: MUTE_NOTIFICATION=true in .env.production — alerts will be logged, never sent. Set MUTE_NOTIFICATION=false for prod.');
  }
  const telescope = process.env.TELESCOPE_ENABLED?.toLowerCase();
  if (telescope === 'true' || telescope === '1') {
    console.log('[entry] WARNING: TELESCOPE_ENABLED=true in .env.production — Telescope is dev-only. Only run this in development or admin-lock it via Gate::define(\'viewTelescope\'). Set TELESCOPE_ENABLED=false for prod.');
  }

  const { deploySPA } = await import('./deploy-spa.js');
  await deploySPA(root, fs);
}

// --- Services (shared between dev and prod) ---

function waitForRedis(timeoutMs = 15000) {
  const host = process.env.REDIS_HOST || '127.0.0.1';
  const port = parseInt(process.env.REDIS_PORT || '6379', 10);
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function attempt() {
      const socket = net.connect(port, host);
      socket.once('connect', () => { socket.end(); resolve(); });
      socket.once('error', () => {
        if (Date.now() - start > timeoutMs) return reject(new Error(`Redis timeout on ${host}:${port}`));
        setTimeout(attempt, 200);
      });
    }
    attempt();
  });
}

const workers = new Map();

function spawnWorker(name, cmd, args) {
  console.log(`[entry] Starting ${name}...`);
  const child = spawn(cmd, args, {
    stdio: 'ignore',
    env: process.env,
    windowsHide: true,
  });
  child.on('exit', (code) => {
    console.log(`[entry] ${name} exited (${code})`);
  });
  workers.set(name, child);
  return child;
}

function killWorkers() {
  workers.forEach((w) => w.kill('SIGTERM'));
}

// Watch .env — on change re-inject env and restart artisan workers.
let debounce;
function reinjectEnv() {
  console.log('[entry] .env changed — reinjecting environment into artisan workers');
  loadEnvIntoProcess([ENV_FILES[mode], '.env']);
spawnSync(php, ['artisan', 'config:clear'], { stdio: 'inherit', windowsHide: true });
  logStatus();
  for (const [name] of workers) {
    workers.get(name).kill('SIGTERM');
    const args = name === 'reverb' ? ['artisan', 'reverb:start']
      : name === 'queue' ? ['artisan', 'queue:work', '-q']
      : ['artisan', 'schedule:work'];
    spawnWorker(name, php, args);
  }
}

for (const file of ['.env', ENV_FILES[mode]]) {
  const p = path.join(root, file);
  if (fs.existsSync(p)) {
    fs.watchFile(p, { interval: 300 }, () => {
      clearTimeout(debounce);
      debounce = setTimeout(reinjectEnv, 300);
    });
  }
}

// --- Start redis, then workers ---
let redis;

if (mode === 'dev') {
  const { result } = concurrently([
    { command: 'redis-server || C:\\redis\\redis-server.exe', name: 'redis', prefixColor: 'yellow' },
    { command: 'npm run dev -w frontend', name: 'dev', prefixColor: 'green' },
    { command: 'npm run dev -w docs', name: 'docs', prefixColor: 'cyan' },
  ], { windowsHide: true });

  process.on('SIGINT', killWorkers);
  process.on('SIGTERM', killWorkers);
  process.on('exit', killWorkers);

  result.then(
    () => process.exit(0),
    (err) => {
      console.error(err);
      process.exit(1);
    },
  );
} else {
  // Prod: spawn redis directly (no shell) to avoid orphaned cmd.exe.
  const redisCmd = fs.existsSync('C:\\redis\\redis-server.exe')
    ? 'C:\\redis\\redis-server.exe'
    : 'redis-server';
  redis = spawn(redisCmd, [], {
    stdio: 'ignore',
    detached: true,
    windowsHide: true,
  });
  redis.unref();

  process.on('SIGINT', killWorkers);
  process.on('SIGTERM', killWorkers);
}

await waitForRedis();

spawnWorker('reverb', php, ['artisan', 'reverb:start']);
spawnWorker('queue', php, ['artisan', 'queue:work', '-q']);

if (mode === 'dev') {
  console.log('[entry] Starting schedule...');
  const sched = spawn(php, ['artisan', 'schedule:work'], {
    stdio: 'ignore',
    env: process.env,
    windowsHide: true,
  });
  sched.on('exit', (code) => console.log(`[entry] schedule exited (${code})`));
  workers.set('schedule', sched);
}
