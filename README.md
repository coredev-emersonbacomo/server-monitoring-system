# Server Monitoring System

Agent-based infrastructure monitoring. A Go agent runs on each monitored host and
reports CPU, memory, disk, network, processes, and open ports to a Laravel API
plus a React dashboard. Live metrics stream over Reverb websockets, history is
stored in TimescaleDB hypertables, and alerts are driven by queue workers and a
node-based alert engine.

## View the docs

```bash
git clone https://github.com/coredev-emersonbacomo/server-monitoring-system.git
cd server-monitoring-system
npm run setup   # composer install + npm install (first time only)
npm run docs
```

`npm run docs` serves the documentation site at http://localhost:5174, where
setup, configuration, environment secrets, testing, deployment, and database
access are documented. This README intentionally stays light.

## Develop

```bash
npm run docker   # Docker app + Vite HMR, no tunnel (local only)
npm run ngrok    # same, plus a public tunnel (needs NGROK_DOMAIN in .env)
```

## Security note (public repo)

All keys in `.env.development` are public dummy placeholders — regenerate them
for your own use and put real credentials only in the gitignored personal
`.env` (never commit it). Details: `npm run docs` → deployment → Environment files.
