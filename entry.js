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

fs.copyFileSync(source, path.join(root, '.env'));
console.log(`[entry] Injected ${ENV_FILES[mode]} -> .env`);

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
  spawnAndPipe(npm, ['run', 'build']);
}