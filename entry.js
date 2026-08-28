#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync, spawn } from 'child_process';

const root = path.dirname(fileURLToPath(import.meta.url));

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

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const spawnAndPipe = (cmd, args) => {
  const child = spawn(cmd, args, { stdio: 'inherit' });
  child.on('exit', (code) => process.exit(code ?? 0));
};

// Surface the visual debugger flag before dropping the config cache, so it's
// visible in startup logs whether telemetry will be emitted. .env overrides
// .env.development (mirrors bootstrap/app.php load order).
const alertDebugger = (() => {
  const read = (p) => {
    if (!fs.existsSync(p)) return null;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (t.startsWith('#') || !t.startsWith('ALERTS_VISUAL_DEBUGGER=')) continue;
      return t.slice('ALERTS_VISUAL_DEBUGGER='.length).trim();
    }
    return null;
  };
  return read(path.join(root, '.env')) ?? read(path.join(root, '.env.development'));
})();
const alertOn = alertDebugger === 'true' || alertDebugger === '1';
console.log(
  `[entry] ALERTS_VISUAL_DEBUGGER=${alertDebugger ?? 'false'} (visual debugger ${alertOn ? 'ENABLED' : 'disabled'})`,
);

// Surface mute-notification and telescope flags for both dev and prod.
const sharedEnv = fs.readFileSync(path.join(root, ENV_FILES[mode]), 'utf8');
const muteNotif = sharedEnv.match(/^MUTE_NOTIFICATION=(.*)$/m)?.[1]?.trim().toLowerCase();
console.log(
  `[entry] MUTE_NOTIFICATION=${muteNotif ?? 'false'} (notifications ${muteNotif === 'true' || muteNotif === '1' ? 'MUTED' : 'active'})`,
);
const telescope = sharedEnv.match(/^TELESCOPE_ENABLED=(.*)$/m)?.[1]?.trim().toLowerCase();
console.log(
  `[entry] TELESCOPE_ENABLED=${telescope ?? 'false'} (Telescope ${telescope === 'true' || telescope === '1' ? 'ENABLED' : 'disabled'})`,
);

// Recompile/drop the Laravel config cache so the swapped .env takes effect.
// Avoid optimize:clear — its cache:clear step needs Redis, which starts later.
spawnSync('php', ['artisan', 'config:clear'], { stdio: 'inherit' });

if (mode === 'dev') {
  spawnAndPipe(process.execPath, ['scripts/dev.js', ...process.argv.slice(3)]);
} else {
  if (muteNotif === 'true' || muteNotif === '1') {
    console.warn('[entry] WARNING: MUTE_NOTIFICATION=true in .env.production — alerts will be logged, never sent. Set MUTE_NOTIFICATION=false for prod.');
  }
  if (telescope === 'true' || telescope === '1') {
    console.warn('[entry] WARNING: TELESCOPE_ENABLED=true in .env.production — Telescope is dev-only. Only run this in development or admin-lock it via Gate::define(\'viewTelescope\'). Set TELESCOPE_ENABLED=false for prod.');
  }
  spawnAndPipe(npm, ['run', 'build']);
}