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

const muteNotification = process.argv.includes('muteNotification');
if (muteNotification) {
  process.env.MUTE_NOTIFICATION = '1';
}

const knownArgs = ['muteNotification'];
const unknownArgs = process.argv.slice(2).filter((arg) => !knownArgs.includes(arg));
if (unknownArgs.length > 0) {
  console.error(`Unknown argument(s): ${unknownArgs.join(', ')}`);
  console.error(`Known arguments: ${knownArgs.join(', ')}`);
  process.exit(1);
}

const commands = [
  { command: 'C:\\Users\\User\\Redis\\redis-server.exe', name: 'redis', prefixColor: 'yellow' },
  { command: 'npm run dev -w frontend', name: 'dev', prefixColor: 'green' },
  { command: 'php artisan reverb:start', name: 'ws', prefixColor: 'cyan' },
  { command: 'php artisan queue:work -q', name: 'queue', prefixColor: 'magenta' },
  { command: 'php artisan schedule:work', name: 'schedule', prefixColor: 'blue' },
];

const { result } = concurrently(commands);

result.then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  },
);
