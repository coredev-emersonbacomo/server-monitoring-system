import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { loadEnvIntoProcess } from './load-env.js';

loadEnvIntoProcess(['.env.development', '.env']);

const schemaDump = path.join(process.cwd(), 'database/schema/pgsql-schema.sql');
if (fs.existsSync(schemaDump)) {
  fs.unlinkSync(schemaDump);
  console.log('Removed stale schema dump (database/schema/pgsql-schema.sql)');
}

// Docker path only when the app container is actually running
// (`ps -q` prints container IDs; empty output = stack down).
const dockerMode = (() => {
  try {
    const out = execSync('docker compose ps -q app', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return out.trim().length > 0;
  } catch {
    return false;
  }
})();

const skipConfirm = process.argv.includes('--yes') || process.argv.includes('-y') || process.argv.includes('--force');

if (dockerMode) {
  console.log('[resetdb] Target: Docker postgres container (database \'server_monitoring\') — via `docker compose exec app`.');
  console.log('[resetdb] WARNING: this wipes ALL data in the Docker database.');
  if (!skipConfirm && input.isTTY) {
    const rl = readline.createInterface({ input, output });
    const answer = (await rl.question('[resetdb] Reset the Docker database? [y/N] ')).trim().toLowerCase();
    rl.close();
    if (answer !== 'y' && answer !== 'yes') {
      console.log('[resetdb] Aborted.');
      process.exit(0);
    }
  }
} else {
  const host = process.env.DB_HOST || '127.0.0.1';
  const port = process.env.DB_PORT || '5432';
  const db = process.env.DB_DATABASE || 'server_monitoring';
  console.log(`[resetdb] Target: local postgres ${host}:${port}/${db} (Herd workflow, direct php artisan).`);
}

// Helper to run PHP artisan - either via docker compose exec or directly
const artisan = (cmd) => {
  if (dockerMode) {
    execSync(`docker compose exec app php artisan ${cmd}`, { stdio: 'inherit' });
  } else {
    execSync(`php artisan ${cmd}`, { stdio: 'inherit' });
  }
};

// pg_dump inside the app image is v15 while the server is v17 (pg_dump
// aborts on major-version mismatch), so dump via the postgres service's
// own pg_dump — version-matched by construction. Never fail the whole
// reset over the snapshot; system:monitor must still run.
const dumpSchema = () => {
  try {
    if (dockerMode) {
      execSync('docker compose exec -T -e PGPASSWORD=postgres postgres pg_dump --no-owner --no-acl --schema=public --schema-only -U postgres -d server_monitoring > database/schema/pgsql-schema.sql', { stdio: 'inherit', shell: true });
    } else {
      artisan('schema:dump');
    }
    console.log('[resetdb] Schema dump refreshed (database/schema/pgsql-schema.sql)');
  } catch {
    console.warn('[resetdb] WARNING: schema dump failed — continuing without a fresh snapshot.');
  }
};

artisan('optimize:clear');
artisan(`tinker --execute="require 'scripts/timescaledb-drop-caggs.php';"`);
artisan('migrate:fresh --seed');
dumpSchema();
artisan('system:monitor');
