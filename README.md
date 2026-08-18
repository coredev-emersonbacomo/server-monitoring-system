## Prerequisites

Install these external services before running the app:

- **PostgreSQL + TimescaleDB** — the app uses TimescaleDB continuous aggregates for metric charts. Migrations auto-create the extension on first run.
- **Redis** — used for caching. In dev, `npm run dev` auto-starts Redis from PATH or `C:\redis\redis-server.exe`. In production, install and run Redis as a daemon.
- **Node.js packages** — run `npm run setup` (runs `composer install && npm install`).

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Full dev environment: Redis, Vite (HMR), Reverb WebSockets, queue worker, scheduler — all auto-started. |
| `npm run resetdb` | Seeder — wipes and reseeds the database. |
| `npm start` | Builds frontend and deploys to `public/`. Does **not** start PHP server, queue, or scheduler. |
| `npm run prod` | Builds only — loads `.env.production`, clears config cache. Does **not** deploy to `public/`. |

## Production deployment

`npm run dev` auto-starts `queue:work` and `schedule:work`, so they need no manual step during development. In production, `npm start` / `npm run prod` do **not** start the queue or scheduler — run them yourself:

- Queue worker as a supervised daemon: `php artisan queue:work` (e.g. via Supervisor)
- Scheduler via cron: `* * * * * php artisan schedule:run`

The built SPA from `npm start` is served by your web server (nginx/PHP-FPM) from `public/`.
