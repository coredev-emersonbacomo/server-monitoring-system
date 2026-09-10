#!/bin/sh
# Container entrypoint: migrate, rebuild frontend if VITE_* env changed
# (app only — workers never serve assets), then exec the service command
# (serve / reverb:start / queue:work / ...).
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

# Frontend build on app boot only (same gate as migrations below): only the
# HTTP server serves these assets, the output lands on the shared bind mount
# for everyone, and a single builder avoids N parallel vite builds racing on
# the same output dir. Workers skip straight to exec.
case "$*" in
  *"frankenphp"*|*"-S"*|*"artisan serve"*)
    if [ "$CURRENT" != "$CACHED" ]; then
      echo "[entrypoint] VITE_* changed — rebuilding frontend..."
      # Frontend workspace + root Laravel assets only. Docs site stays local-only
      # (`npm run docs` in repo root) and is never built or hosted here.
      npm run build -w frontend && npx vite build
      echo "$CURRENT" > "$CHECKSUM_FILE"
    else
      echo "[entrypoint] Frontend up to date, skipping build."
    fi
    ;;
  *)
    echo "[entrypoint] Non-serving command — skipping frontend build."
    ;;
esac

# Migrations + first-boot seeding on app boot only (matches frankenphp
# serve / php -S in any form). migrate --force is idempotent.
#
# SEED_ON_BOOT flip switch (handover-critical):
#   "true"  → run `php artisan db:seed --force`, but ONLY when the users
#              table is empty (fresh volume). DatabaseSeeder factories are
#              NOT idempotent — the empty check is what makes reboots safe.
#              NEVER use migrate:fresh here: it would wipe prod on restart.
#   unset/"false" → skip seeding entirely.
# Dev sets SEED_ON_BOOT=true (self-provisioning). Prod sets false; create
# the first prod admin ONCE with:
#   docker compose -f compose.yaml -f compose.prod.yaml exec app \
#     php artisan db:seed --class=UserSeeder --force   (idempotent, default user only)
case "$*" in
  *"frankenphp"*|*"-S"*|*"artisan serve"*)
    echo "[entrypoint] Running migrations..."
    php artisan migrate --force
    if [ "${SEED_ON_BOOT:-false}" = "true" ]; then
      USERS=$(php artisan tinker --execute='echo App\Models\User::query()->count();' 2>/dev/null | tr -cd '0-9')
      if [ "$USERS" = "0" ]; then
        echo "[entrypoint] SEED_ON_BOOT=true and users table empty — seeding..."
        php artisan db:seed --force
      else
        echo "[entrypoint] Users present (${USERS:-unknown}) — skipping seed."
      fi
    else
      echo "[entrypoint] SEED_ON_BOOT!=true — skipping seed."
    fi
    ;;
esac

exec "$@"
