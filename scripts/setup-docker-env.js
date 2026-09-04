#!/usr/bin/env node
// Generates .env.docker from .env.docker.example with everything generatable
// filled in. Third-party keys (mail, Cloudinary, Discord) stay blank.
// Platform-agnostic: works for Render, personal server, company VM — anywhere.
// Usage: npm run setup:docker [-- --force] [--app-url https://...]
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomBytes } from 'crypto';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const example = path.join(root, '.env.docker.example');
const target = path.join(root, '.env.docker');

const force = process.argv.includes('--force');
const appUrlArg = process.argv.find((a, i) => process.argv[i - 1] === '--app-url');
const appUrl = appUrlArg || 'https://your-domain.com';

if (fs.existsSync(target) && !force) {
  console.error('.env.docker exists — re-run with -- --force to overwrite.');
  process.exit(1);
}

const hex = (n) => randomBytes(n).toString('hex');
const b64 = (n) => `base64:${randomBytes(n).toString('base64')}`;

const generated = {
  APP_URL: appUrl,
  APP_KEY: b64(32),
  JWT_SECRET: hex(32),
  DB_PASSWORD: hex(16),
  REDIS_PASSWORD: hex(16),
  REVERB_APP_ID: String(Math.floor(100000 + Math.random() * 900000)),
  REVERB_APP_KEY: hex(10),
  REVERB_APP_SECRET: hex(10),
};

// VITE_* + APP_DOMAIN derived from APP_URL so frontend/proxy match backend.
try {
  const host = new URL(appUrl).hostname;
  generated.APP_DOMAIN = host;
  generated.VITE_REVERB_HOST = host;
  generated.VITE_DOCS_URL = `${appUrl}/docs`;
} catch {
  // keep example placeholders when APP_URL is not a valid URL yet
}

let out = fs.readFileSync(example, 'utf8');
for (const [key, value] of Object.entries(generated)) {
  const re = new RegExp(`^${key}=.*$`, 'm');
  out = re.test(out) ? out.replace(re, `${key}=${value}`) : `${out}\n${key}=${value}`;
}
fs.writeFileSync(target, out);

console.log('.env.docker written. Generated: APP_KEY, JWT_SECRET, DB/REDIS passwords, REVERB_APP_*.');
console.log('Still blank (fill if needed): MAIL_*, CLOUDINARY_*, Discord, VITE_DOCS_URL if custom.');
console.log(`APP_URL=${appUrl} — re-run with -- --app-url <real-url> --force when known.`);
