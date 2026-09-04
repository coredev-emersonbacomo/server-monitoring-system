#!/bin/sh
# Container entrypoint: migrate, rebuild frontend if VITE_* env changed,
# then exec the service command (serve / reverb:start / queue:work / ...).
# This makes RUNTIME env (Render dashboard, .env.docker) authoritative —
# no image rebuild needed when URLs/keys change, just restart.
set -e

# Derive VITE_* twins from backend vars when not set explicitly.
# (Vite only reads VITE_*; REVERB_* is the single source of truth.)
: "${VITE_REVERB_APP_KEY:=$REVERB_APP_KEY}"
: "${VITE_REVERB_HOST:=$REVERB_HOST}"
: "${VITE_REVERB_PORT:=$REVERB_PORT}"
: "${VITE_REVERB_SCHEME:=$REVERB_SCHEME}"
export VITE_REVERB_APP_KEY VITE_REVERB_HOST VITE_REVERB_PORT VITE_REVERB_SCHEME

CHECKSUM_FILE=/tmp/vite-env.checksum
CURRENT=$(env | grep '^VITE_' | sort | sha256sum | cut -d' ' -f1)
CACHED=""
[ -f "$CHECKSUM_FILE" ] && CACHED=$(cat "$CHECKSUM_FILE")

if [ "$CURRENT" != "$CACHED" ]; then
  echo "[entrypoint] VITE_* changed — rebuilding frontend..."
  # Frontend workspace + root Laravel assets only. Docs site stays local-only
  # (`npm run docs` in repo root) and is never built or hosted here.
  npm run build -w frontend && npx vite build
  echo "$CURRENT" > "$CHECKSUM_FILE"
else
  echo "[entrypoint] Frontend up to date, skipping build."
fi

# Migrations on app boot only (reverb/queue/scheduler pass different CMDs,
# but migrate --force is idempotent so harmless if it runs there too).
if [ "$1" = "php" ] && [ "$2" = "artisan" ] && [ "$3" = "serve" ]; then
  echo "[entrypoint] Running migrations..."
  php artisan migrate --force
fi

exec "$@"
