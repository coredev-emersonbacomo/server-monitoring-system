#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'frontend', 'dist');
const target = path.join(root, 'public');

if (!fs.existsSync(dist)) {
  console.error('[start] frontend/dist not found — run `npm run build` first');
  process.exit(1);
}

// Deploy the built SPA into public/ so the backend serves it at APP_URL root.
if (fs.existsSync(path.join(target, 'assets'))) {
  fs.rmSync(path.join(target, 'assets'), { recursive: true, force: true });
}
fs.cpSync(dist, target, { recursive: true, force: true });

const envFile = path.join(root, '.env');
const env = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
const appUrl = env.match(/^APP_URL=(.*)$/m)?.[1]?.trim() || 'http://localhost';
const telescopeEnabled = env.match(/^TELESCOPE_ENABLED=(.*)$/m)?.[1]?.trim().toLowerCase();
if (telescopeEnabled === 'true' || telescopeEnabled === '1') {
    console.warn('[start] WARNING: TELESCOPE_ENABLED=true in production — Telescope exposes request/job data. Only run this in development or admin-lock it via Gate::define(\'viewTelescope\') and TELESCOPE_ADMIN_EMAILS. Set TELESCOPE_ENABLED=false for prod.');
}
console.log(`[start] UI built and deployed. Open ${appUrl}`);
