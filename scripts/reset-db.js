import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const schemaDump = path.join(process.cwd(), 'database/schema/pgsql-schema.sql');
if (fs.existsSync(schemaDump)) {
  fs.unlinkSync(schemaDump);
  console.log('Removed stale schema dump (database/schema/pgsql-schema.sql)');
}

execSync('php artisan optimize:clear', { stdio: 'inherit' });

execSync(`php artisan tinker --execute="require 'scripts/timescaledb-drop-caggs.php';"`, { stdio: 'inherit' });

execSync('php artisan migrate:fresh --seed', { stdio: 'inherit' });

execSync('php artisan schema:dump', { stdio: 'inherit' });

execSync('php artisan system:monitor', { stdio: 'inherit' });

