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

// Recompile/drop the Laravel config cache so the swapped .env takes effect.
// Avoid optimize:clear — its cache:clear step needs Redis, which starts later.
spawnSync('php', ['artisan', 'config:clear'], { stdio: 'inherit' });

if (mode === 'dev') {
  spawnAndPipe(process.execPath, ['scripts/dev.js', ...process.argv.slice(3)]);
} else {
  const prodEnv = fs.existsSync(path.join(root, '.env.production')) ? fs.readFileSync(path.join(root, '.env.production'), 'utf8') : '';
  const telEnabled = prodEnv.match(/^TELESCOPE_ENABLED=(.*)$/m)?.[1]?.trim().toLowerCase();
  if (telEnabled === 'true' || telEnabled === '1') {
    console.warn('[entry] WARNING: TELESCOPE_ENABLED=true in .env.production — Telescope is dev-only. Only run this in development or admin-lock it via Gate::define(\'viewTelescope\'). Set TELESCOPE_ENABLED=false for prod.');
  }
  spawnAndPipe(npm, ['run', 'build']);
}