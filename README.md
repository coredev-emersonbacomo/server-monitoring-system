# Server Monitoring System

Agent-based infrastructure monitoring: Go agents on monitored hosts report to a
Laravel API + React dashboard, with Reverb websockets for live updates,
TimescaleDB hypertables for metrics history, and queue workers for alerts.

## Run it (pick one)

### A. Local dev with Herd (Windows, current workflow)

Prereqs: [Laravel Herd](https://herd.laravel.com) (PHP 8.5), Node 22,
`C:\redis\redis-server.exe`, PostgreSQL with TimescaleDB.

```powershell
npm run setup     # composer install + npm install (first time only)
npm run dev       # redis + vite + reverb + queue + scheduler
```

App: http://server-monitoring-system.test · Frontend dev: http://localhost:5173

```powershell
npm run tunnel    # expose via Cloudflare quick tunnel (random URL, for agent testing)
```

### B. Local dev with Docker (any OS)

Prereqs: [Docker Desktop](https://www.docker.com/products/docker-desktop/) running.

```powershell
docker compose up --build
```

App: http://localhost:8000 · Reverb: ws://localhost:8081.
TimescaleDB + Redis included — nothing else to install.
First boot migrates and seeds automatically (login: `user` / `user123`).
Source is bind-mounted (live edits).

Pre-prod testing (stable tunnel, expose to agents):

```bash
npm run ngrok   # starts Docker stack, builds with ngrok URL, tunnels to your reserved domain
```

Configure in your gitignored `.env`: `NGROK_DOMAIN` (reserved ngrok domain) and
`NGROK_UPSTREAM=127.0.0.1:8000` (Docker app). For Herd: set `NGROK_UPSTREAM=127.0.0.1:80` instead.

`npm run tim` is the Linux variant (no Herd there): same as `npm run dev`, but the Vite proxy targets `http://127.0.0.1:8000` — bring your own backend on :8000 (e.g. `docker compose up`).

### C. Production on a physical server (primary prod path)

Prereqs on the server: Docker Engine + compose plugin, DNS `A` record
(e.g. `monitor.company.com`) → server IP, ports 80/443 open.

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
- `docs/` — docs site, local-only (`npm run docs`, port 5174, never hosted)
- `scripts/entry.js` — dev/prod process manager (`npm run dev` / `npm start`)
- `scripts/tunnel.js` — Cloudflare quick tunnel (`npm run tunnel`)
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
- Local Herd dev: `npm run resetdb` (fresh migrate + seed + schema dump).

## Database access

Run from the repo root on the machine hosting the stack:

```powershell
npm run db        # dev: psql into local TimescaleDB
npm run db:prod   # prod server (over SSH): psql into prod DB
```

GUI (DBeaver/TablePlus/pgAdmin): dev → `localhost:5432` / `postgres` / `postgres` /
`server_monitoring`. Prod server → SSH tunnel or temporary port mapping.

Useful when the UI can't answer it: inspect/revoke provision tokens, query
hypertables directly (`time_bucket` checks), verify continuous aggregates are
refreshing, or fix a failed migration row without a full reset.
