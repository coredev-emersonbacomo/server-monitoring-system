# Server Monitoring System

Agent-based infrastructure monitoring: Go agents on monitored hosts report to a
Laravel API + React dashboard, with Reverb websockets for live updates,
TimescaleDB hypertables for metrics history, and queue workers for alerts.

## Run it (pick one)

### A. Local dev with Herd (Windows, current workflow)

1. Install prerequisites:
   - [Laravel Herd](https://herd.laravel.com) — bundles PHP 8.5 and Composer.
   - [Node.js 22 LTS](https://nodejs.org/en/download) (Vite dev servers).
   - Redis — easiest: `npm run install-redis:windows` (fetches the
     [redis-windows](https://github.com/redis-windows/redis-windows) build to
     `C:\redis\redis-server.exe`, which the dev tooling uses automatically).
   - PostgreSQL 17 + TimescaleDB —
     [Windows installer](https://www.postgresql.org/download/windows/), then
     enable TimescaleDB per the
     [self-hosted install docs](https://docs.timescale.com/self-hosted/latest/install/).
     (Or skip all of this with [Docker](#b-local-dev-with-docker-any-os).)
   - [Git](https://git-scm.com/downloads).

```powershell
npm run setup     # composer install + npm install (first time only)
npm run dev       # redis + vite + reverb + queue + scheduler
```

App: http://server-monitoring-system.test · Frontend dev: http://localhost:5173

```powershell
npm run tunnel    # expose via Cloudflare quick tunnel (random URL, for agent testing)
```

### B. Local dev with Docker (any OS)

Windows: enable virtualization in BIOS first (Task Manager > Performance > CPU
must say `Virtualization: Enabled`), then in an elevated PowerShell
`wsl --install --no-distribution`, reboot, `wsl --update`, then install
[Docker Desktop](https://www.docker.com/products/docker-desktop/) with the
WSL 2 engine. macOS: install Docker Desktop (Apple Silicon vs Intel).
Linux: install [Engine + compose plugin](https://docs.docker.com/engine/install/).

```powershell
# new terminal after install, then verify + start:
docker --version
# Windows:
where.exe docker
# macOS / Linux:
which docker
docker compose up --build
```

App: http://localhost:8000 · Reverb: ws://localhost:8081.
TimescaleDB + Redis included — nothing else to install.
First boot migrates and seeds automatically (login: `user` / `user123`).
Source is bind-mounted (live edits).

Pre-prod testing (stable tunnel with HMR, expose to agents):

```bash
npm run ngrok        # HMR flow (default): Docker stack + Vite dev + tunnel → Vite
npm run ngrok:build  # static flow: builds the SPA, tunnels straight to Laravel
```

1. Reserve a domain at [ngrok](https://ngrok.com) and install the CLI
   ([Windows Store / MSIX](https://ngrok.com/docs/getting-started) or package manager).
2. Put your values in gitignored `.env` (full URLs):
   `NGROK_DOMAIN=bottle-zippy-revivable.ngrok-free.dev`,
   `NGROK_UPSTREAM=http://127.0.0.1:8000` (Docker app).
   For Herd instead: `NGROK_UPSTREAM=http://server-monitoring-system.test`.
3. Run `npm run ngrok`, then **regenerate the provision token** in the
   dashboard — install commands bake the tunnel URL + tunnel headers at
   generation time.
Only one `npm run ngrok` at a time (a second run refuses via the `.ngrok.pid`
lock). Ctrl+C stops tunnel + Vite and parks the Docker stack stopped
(`docker compose up -d` to resume).

`npm run tim` is the Linux variant (no Herd there): same as `npm run dev`, but the Vite proxy targets `http://127.0.0.1:8000` — bring your own backend on :8000 (e.g. `docker compose up`).

Rebuilding the monitoring agent (`npm run compileagent`) needs the [Go toolchain](https://go.dev/dl) on the host (pre-built binaries are committed, so only needed when agent code changes).

### C. Production on a physical server (primary prod path)

Prereqs on the server: [Docker Engine + compose plugin](https://docs.docker.com/engine/install/),
a DNS `A` record (e.g. `monitor.company.com`) → server IP, ports 80/443 open.

```bash
git clone <repo> && cd server-monitoring-system
npm run setup:docker -- --app-url https://monitor.company.com
# fill MAIL_*/CLOUDINARY_* in .env.docker only if needed
docker compose -f compose.yaml -f compose.prod.yaml up -d --build
```

Caddy terminates HTTPS automatically (Let's Encrypt) and routes
`/app/*` → Reverb websockets, everything else → Laravel.
First boot migrates and seeds (login: `user` / `user123`); data persists
in Docker volumes.

**Updates:** `git pull && docker compose -f compose.yaml -f compose.prod.yaml up -d --build`
(~30s downtime; migrations run on boot).

**Backups (nightly cron on the host):**
```bash
docker compose -f compose.yaml -f compose.prod.yaml exec -T postgres \
  pg_dump -U postgres server_monitoring | gzip > backup-$(date +%F).sql.gz
```

## Secrets inventory (`.env.docker`)

| Key | Where to get it |
|---|---|
| `APP_KEY` | `php artisan key:generate --show` |
| `APP_DOMAIN` | your public domain (**required** — Caddy auto-HTTPS + compose.prod fails without it) |
| `JWT_SECRET` | any 64-hex string |
| `DB_PASSWORD` / `REDIS_PASSWORD` | invent strong ones |
| `REVERB_APP_*` | `php artisan reverb:install` or reuse dev values |
| `MAIL_USERNAME/PASSWORD` | Gmail app password |
| `CLOUDINARY_*` | cloudinary.com dashboard |
| `DEFAULT_*_PICTURE/BANNER` | any image URLs (defaults in `.env.development`) |
| Discord bot token | Discord developer portal (seeded dev values in `.env.development`) |

Never commit `.env`, `.env.production`, or `.env.docker` (all gitignored).

## Repo map

- `app/` — Laravel backend (API, agents, alerts, provisioning)
- `frontend/` — React dashboard (Vite, port 5173)
- `docs/` — docs site, local-only (runs under `npm run dev`, port 5174, never hosted)
- `scripts/entry.js` — dev/prod process manager (`npm run dev` / `npm start`)
- `scripts/tunnel.js` — Cloudflare quick tunnel (`npm run tunnel`)
- `scripts/ngrok.js` / `scripts/ngrok-build.js` — HMR / static tunnels (`npm run ngrok` / `npm run ngrok:build`)
- `scripts/reset-db.js` — dual-workflow DB reset (`npm run resetdb`)
- `Dockerfile` — multi-stage (`dev` / `prod` targets)
- `compose.yaml` / `compose.prod.yaml` — dev / production stacks
- `TODO/` — work backlog (source of truth for pending work)
- `docs/architecture/` — ADRs (read before changing architecture)

## Tests

```powershell
npm test                    # full Pest suite
npm run test:filter -- Name # single filter
vendor/bin/pint --dirty     # format PHP before committing
```

CI (`.github/workflows/ci.yml`) runs Pest + Pint + frontend build on every push.

## Seeding (`SEED_ON_BOOT` flip switch)

- **Dev** (`compose.yaml` sets `SEED_ON_BOOT=true`): first boot seeds the full
  `DatabaseSeeder` (default user `user` / `user123` + demo clients/servers) —
  but **only when the users table is empty**. Reboots never duplicate or wipe.
- **Prod** (`compose.prod.yaml` sets `SEED_ON_BOOT=false`): never auto-seeds.
  Create the first prod user once with:
  ```bash
  docker compose -f compose.yaml -f compose.prod.yaml exec app \
    php artisan db:seed --class=UserSeeder --force
  ```
  (`UserSeeder` is idempotent — safe to re-run. Never run `migrate:fresh`
  or full `db:seed` in prod: factories would duplicate demo data.)
- `npm run resetdb` works in both flows (fresh migrate + seed + schema dump): with the Docker stack up it resets the Docker DB — printing its target and asking `[y/N]` first (`--yes` skips) — otherwise the local Herd DB.

## Database access

Run from the repo root on the machine hosting the stack:

```powershell
npm run db        # dev: psql into local TimescaleDB
npm run db:prod   # prod server (over SSH): psql into prod DB
```

GUI (DBeaver/TablePlus/pgAdmin): dev → `localhost:5432` / `postgres` / `postgres` /
`server_monitoring`. Prod server → SSH tunnel or temporary port mapping.

⚠️ One port, two possible databases: a native `postgres.exe` owns `0.0.0.0:5432`
while the Docker proxy holds only `[::]:5432`, so `127.0.0.1:5432` clients read
the *native* DB and `localhost` may resolve to `::1` (Docker DB). Stop one
postgres when working in the other flow, or point your GUI client explicitly.

Useful when the UI can't answer it: inspect/revoke provision tokens, query
hypertables directly (`time_bucket` checks), verify continuous aggregates are
refreshing, or fix a failed migration row without a full reset.
