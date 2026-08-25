import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import concurrently from 'concurrently';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const credsFile = path.join(__dirname, '..', '.env.credentials');
if (fs.existsSync(credsFile)) {
  for (const line of fs.readFileSync(credsFile, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    if (value.length >= 2 && ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'")))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
  console.log('Loaded credentials from .env.credentials');
}

// MUTE_NOTIFICATION is an env var in .env.development (e.g. MUTE_NOTIFICATION=true)
// to suppress notifications during development.
// Load .env.development into process.env for child artisan processes (Reverb port, etc.)
// when dev.js is run directly without entry.js. entry.js already clears config cache
// but does not export env vars to the Node process.
const devEnvFile = path.join(__dirname, '..', '.env.development');
if (fs.existsSync(devEnvFile)) {
  for (const line of fs.readFileSync(devEnvFile, 'utf8').split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#') || !t.includes('=')) continue;
    const i = t.indexOf('=');
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (v.length >= 2 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))) v = v.slice(1, -1);
    // Expand ${VAR} references (e.g. VITE_APP_NAME="${APP_NAME}")
    v = v.replace(/\$\{([^}]+)\}/g, (_, name) => process.env[name] ?? v);
    if (process.env[k] == null && v !== '') process.env[k] = v;
  }
}
const unknownArgs = process.argv.slice(2);
if (unknownArgs.length > 0) {
  console.error(`Unknown argument(s): ${unknownArgs.join(', ')}`);
  process.exit(1);
}

if (String(process.env.MUTE_NOTIFICATION).toLowerCase() === 'true' || process.env.MUTE_NOTIFICATION === '1') {
  console.log('[dev] MUTE_NOTIFICATION=true — notifications muted (queue worker will log skipped sends)');
}

const waitRedis = 'node scripts/wait-for-redis.js';

const commands = [
  { command: 'redis-server || C:\\redis\\redis-server.exe', name: 'redis', prefixColor: 'yellow' },
  { command: 'npm run dev -w frontend', name: 'dev', prefixColor: 'green' },
  { command: `${waitRedis} && php artisan reverb:start`, name: 'ws', prefixColor: 'cyan' },
  { command: `${waitRedis} && php artisan queue:work -q`, name: 'queue', prefixColor: 'magenta' },
  { command: `${waitRedis} && php artisan schedule:work`, name: 'schedule', prefixColor: 'blue' },
];

const { result } = concurrently(commands);

result.then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
