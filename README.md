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
First boot runs migrations automatically. Source is bind-mounted (live edits).

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
First boot migrates; data persists in Docker volumes.

**Updates:** `git pull && docker compose -f compose.yaml -f compose.prod.yaml up -d --build`
(~30s downtime; migrations run on boot).

**Backups (nightly cron on the host):**
```bash
docker compose -f compose.yaml -f compose.prod.yaml exec -T postgres \
  pg_dump -U postgres server_monitoring | gzip > backup-$(date +%F).sql.gz
```

### D. Production on Render (alternative, no server needed)

Dashboard → New → Blueprint → connect repo (`render.yaml`).
Secrets auto-generate once via the `server-monitoring-secrets` group;
fill `sync: false` keys (`MAIL_*`, `CLOUDINARY_*`) in the dashboard.
Set `APP_URL` to the Render URL after first deploy, redeploy once.
`git push` to `main` rebuilds and redeploys automatically.

## Secrets inventory (`.env.docker` / Render env)

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
- `compose.yaml` / `compose.prod.yaml` — local / production stacks
- `render.yaml` — Render blueprint
- `TODO/` — work backlog (source of truth for pending work)
- `docs/architecture/` — ADRs (read before changing architecture)

## Tests

```powershell
npm test                    # full Pest suite
npm run test:filter -- Name # single filter
vendor/bin/pint --dirty     # format PHP before committing
```

CI (`.github/workflows/ci.yml`) runs Pest + Pint + frontend build on every push.

## Database access

Run from the repo root on the machine hosting the stack:

```powershell
npm run db        # dev: psql into local TimescaleDB
npm run db:prod   # prod server (over SSH): psql into prod DB
```

GUI (DBeaver/TablePlus/pgAdmin): dev → `localhost:5432` / `postgres` / `postgres` /
`server_monitoring`. Render → postgres service → Connect → external string (SSL on).

Useful when the UI can't answer it: inspect/revoke provision tokens, query
hypertables directly (`time_bucket` checks), verify continuous aggregates are
refreshing, or fix a failed migration row without a full reset.
