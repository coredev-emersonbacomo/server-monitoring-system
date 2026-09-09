---
status: completed
created: 2026-09-08
started: 2026-09-08
completed: 2026-09-08
adr: none
---

# Ngrok env: memory-only APP_URL/SKIP for Docker, file channel only for Herd

## Objective

`npm run ngrok` / `npm run ngrok:build` currently write `APP_URL=<tunnel>` and
`NGROK_SKIP_BROWSER_WARNING=true` into the gitignored `.env` on every run and never
reset them. That sticky run-state leaks into later plain (non-ngrok) runs. Split the
channels: Docker gets memory-only injection (`process.env` → compose interpolation →
real container env, which wins immutably); Herd keeps the `.env` file write (only
channel into the separate Herd PHP process tree) with snapshot-and-restore on exit.

## Implementation Tasks

- [x] `scripts/ngrok.js`: always set `process.env`, write `.env` only for Herd upstream; snapshot + restore `.env` on exit; print Herd worker-restart reminder; cleanup completion marker
- [x] `scripts/ngrok-build.js`: move `process.env.APP_URL` before `compose up`, same conditional `.env` treatment
- [x] `compose.yaml`: add `APP_URL: ${APP_URL:-http://localhost:8000}` to `reverb`/`queue`/`scheduler` so siblings follow memory too
- [x] Update `DocsDeploymentContent` (both copies): Docker bullet no longer says "writes APP_URL to .env"
- [x] Verify: `node --check`, `docker compose config` (default + tunnel env), docs + frontend builds

## Active Subtask

**Item:** Split ngrok env channels (memory for Docker, file + restore for Herd)

**Status:** [•] in progress

### Working State

- `ngrok.js` `cleanup()` uses blocking `spawnSync` for `docker compose stop` — the stray
  mid-cleanup `PS ...>` prompt in the user's paste is the parent shell's own Ctrl+C
  echo (Windows delivers Ctrl+C to every attached process), not an early exit: all 6
  containers show Stopped. Fix = explicit completion marker, not waiting logic.
- `ngrok-build.js` sets `process.env.APP_URL` AFTER `compose up`, so it only works via
  the sticky `.env` from a previous run (same reserved domain masks it). Must move the
  assignment before `up` as part of the memory-only change.
- `tunnel.js:118-145` already establishes Herd PHP workers need a restart to pick up a
  `.env` APP_URL change; `ngrok.js` Herd branch never prints that reminder.

### Files

- `scripts/ngrok.js`
- `scripts/ngrok-build.js`
- `compose.yaml`
- `frontend/src/components/docs/DocsDeploymentContent.tsx`
- `docs/src/components/docs/DocsDeploymentContent.tsx`

### Verification

- Pending: `node --check` x2, `docker compose config` default + tunnel, docs + frontend builds.

### Known Issues

- Hard-kill (kill -9 / closing the terminal) skips `cleanup()` — Herd `.env` restore
  only runs on SIGINT/SIGTERM/normal exit. Docker self-heals regardless.

## Requirements

- Docker flow must self-heal: after ngrok exits, plain `docker compose up` reverts to `localhost:8000` with no manual `.env` edit.
- Herd flow must keep working: `.env` write stays (only channel), restored on exit, restart reminder printed.
- Prod untouched (`compose.prod.yaml` pins both vars; `APP_URL: ${APP_URL:?...}` required).

## Decisions

- Memory-only for Docker, file channel only for Herd (user-approved split).
- Single `bcdedit` docs decision from prior task stands; not touched here.

## Deferred / Skipped (known gaps)

None.

## Context Summary

Done 2026-09-08. Docker ngrok runs are now memory-only: `process.env` set before
`compose up` flows through interpolation into all four PHP services as real env
(`compose.yaml` gained the `APP_URL` line on reverb/queue/scheduler); no `.env`
write, so plain `docker compose up` self-heals to localhost. Herd runs keep the
`.env` write (only channel) with snapshot-and-restore via shared
`restoreEnvLine()` in `scripts/load-env.js`, plus the worker-restart reminder.
Also fixed latent `ngrok-build.js` ordering bug (`APP_URL` was assigned after
`up`, so the container only ever saw the stale `.env` value). Cleanup now ends
with an explicit completion marker; the stray mid-cleanup prompt is the parent
shell's own Ctrl+C echo (spawnSync already blocks — paste shows all 6 stopped).
Verified: `node --check` x3, `docker compose config` in an isolated copy
(defaults localhost x4, tunnel x4 from process env alone), `restoreEnvLine`
3-case harness, docs + frontend builds pass. No ADR (script behavior, no
architectural decision). Commit message refreshed in
`scripts/git/git-commit-message.txt`.

## Active Subtask

**Item:** Split ngrok env channels (memory for Docker, file + restore for Herd)

**Status:** [x] complete
