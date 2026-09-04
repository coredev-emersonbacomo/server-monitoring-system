#!/bin/sh
# Container entrypoint: migrate, rebuild frontend if VITE_* env changed,
# then exec the service command (serve / reverb:start / queue:work / ...).
# This makes RUNTIME env (.env.docker) authoritative —
# no image rebuild needed when URLs/keys change, just restart.
set -e

# Derive VITE_* twins from backend vars when not set explicitly.
# (Vite only reads VITE_*; REVERB_* is the single source of truth.)
if [ -z "${VITE_REVERB_HOST:-}" ]; then
  echo "[entrypoint] WARNING: VITE_REVERB_HOST unset — falling back to REVERB_HOST ($REVERB_HOST)."
  echo "[entrypoint] If browsers can't reach websockets, set VITE_REVERB_HOST to the PUBLIC reverb URL."
fi
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

# Migrations on app boot only (matches `artisan serve` in any CMD form).
# Idempotent (migrate --force), so harmless if another service matches.
case "$*" in
  *"artisan serve"*)
    echo "[entrypoint] Running migrations..."
    php artisan migrate --force
    ;;
esac

exec "$@"
