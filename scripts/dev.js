import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, spawnSync } from 'child_process';
import concurrently from 'concurrently';
import { loadEnvIntoProcess } from './load-env.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Load .env.development, then let .env override it (mirrors bootstrap/app.php
// load order). .env is gitignored and is the place for local secrets (e.g.
// Gmail SMTP credentials) — Laravel reads it directly, no runtime injection
// needed. Loaded env (including VITE_* vars) is available to the Vite dev
// server, which is spawned with this process's env. Pulled into a function so
// we can re-inject on file changes.
loadEnvIntoProcess(['.env.development', '.env']);

function logStatus() {
  if (String(process.env.MUTE_NOTIFICATION).toLowerCase() === 'true' || process.env.MUTE_NOTIFICATION === '1') {
    console.log('[dev] MUTE_NOTIFICATION=true — notifications muted (queue worker will log skipped sends)');
  }
  if (String(process.env.ALERTS_VISUAL_DEBUGGER).toLowerCase() === 'true' || process.env.ALERTS_VISUAL_DEBUGGER === '1') {
    console.log('[dev] ALERTS_VISUAL_DEBUGGER=true — alert visual debugger enabled (backend telemetry + /settings/alerts/debugger)');
  }
}

logStatus();

const unknownArgs = process.argv.slice(2);
if (unknownArgs.length > 0) {
  console.error(`Unknown argument(s): ${unknownArgs.join(', ')}`);
  process.exit(1);
}

const waitRedis = 'node scripts/wait-for-redis.js';

// Artisan processes cache env/config at boot, so they must be restarted to pick
// up .env changes. They're managed directly (not via concurrently) so a .env
// edit only restarts them — redis and the vite dev server keep running.
const workerDefs = [
  { name: 'ws', cmd: `${waitRedis} && php artisan reverb:start` },
  { name: 'queue', cmd: `${waitRedis} && php artisan queue:work -q` },
  { name: 'schedule', cmd: `${waitRedis} && php artisan schedule:work` },
];

const workers = new Map();

function spawnWorker(def) {
  const child = spawn(def.cmd, {
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code) => {
    // Don't respawn on unexpected exit during dev; let the user see it.
    console.log(`[dev] ${def.name} worker exited (${code})`);
  });
  workers.set(def.name, child);
  return child;
}

workerDefs.forEach(spawnWorker);

// Watch .env (and .env.development) — on change re-inject env into the running
// artisan workers: clear config cache, re-log status, and restart them.
let debounce;
function reinjectEnv() {
  console.log('[dev] .env changed — reinjecting environment into artisan workers');
  loadEnvIntoProcess(['.env.development', '.env']);
  spawnSync('php', ['artisan', 'config:clear'], { stdio: 'inherit' });
  logStatus();
  for (const def of workerDefs) {
    workers.get(def.name)?.kill('SIGTERM');
    spawnWorker(def);
  }
}

for (const file of ['.env', '.env.development']) {
  const p = path.join(root, file);
  if (fs.existsSync(p)) {
    fs.watchFile(p, { interval: 300 }, () => {
      clearTimeout(debounce);
      debounce = setTimeout(reinjectEnv, 300);
    });
  }
}

const commands = [
  { command: 'redis-server || C:\\redis\\redis-server.exe', name: 'redis', prefixColor: 'yellow' },
  { command: 'npm run dev -w frontend', name: 'dev', prefixColor: 'green' },
  { command: 'npm run dev -w docs', name: 'docs', prefixColor: 'cyan' },
];

const { result } = concurrently(commands);

function killWorkers() {
  workers.forEach((w) => w.kill('SIGTERM'));
}

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
