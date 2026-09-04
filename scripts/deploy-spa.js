import path from 'path';
import { spawnSync } from 'child_process';

export async function deploySPA(root, fs) {
  // Build frontend + root Laravel Vite (echo.js).
  // NB: .cmd files need shell:true (spawnSync npx.cmd → EINVAL otherwise).
  const fe = spawnSync('npx vite build', { cwd: path.join(root, 'frontend'), stdio: 'inherit', shell: true });
  if (fe.error) console.log(`[deploy-spa] Frontend build error: ${fe.error.message}`);
  else if (fe.status !== 0) console.log(`[deploy-spa] Frontend build exited (${fe.status})`);
  const be = spawnSync('npx vite build', { cwd: root, stdio: 'inherit', shell: true });
  if (be.error) console.log(`[deploy-spa] Root build error: ${be.error.message}`);
  else if (be.status !== 0) console.log(`[deploy-spa] Root build exited (${be.status})`);

  const dist = path.join(root, 'frontend', 'dist');
  const target = path.join(root, 'public');

  if (!fs.existsSync(dist)) {
    console.error('[deploy-spa] frontend/dist not found — run `npm run build` first');
    process.exit(1);
  }

  // Deploy the built SPA into public/ so the backend serves it at APP_URL root.
  if (fs.existsSync(path.join(target, 'assets'))) {
    fs.rmSync(path.join(target, 'assets'), { recursive: true, force: true });
  }
  fs.cpSync(dist, target, { recursive: true, force: true });

  console.log('[deploy-spa] UI built and deployed');
}
