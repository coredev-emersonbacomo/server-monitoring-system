---
status: active
created: 2026-09-07
started: 2026-09-07
---

# ngrok HMR flow + login autofill transparency

## Objective
Make `npm run ngrok` the HMR dev flow (`Internet → ngrok → Vite:5173 → Laravel local`), keep `npm run ngrok:build` for static-asset verification, and fix browser autofill rendering login text invisible.

## Implementation Tasks
- [x] Final autofill fix: explicit `var(--card)` / `var(--card-foreground)` global CSS in both workspaces, remove conflicting inline Tailwind autofill classes
- [•] Fix `scripts/ngrok.js`: detect Docker state, auto-start backend when down, target correct backend (Docker app vs Herd), ensure Ctrl+C stops all spawned services
- [x] Verify hypertable/cagg root-cause fix (provider registration) via fresh migrate checks
  [2026-09-09 VERIFIED + FIXED, no Docker needed: built scratch DB
  `server_monitoring_verify` via dump-load → confirmed 0 hypertables / 0 caggs
  (pg_dump restores plain tables/views; the CREATE migrations are marked run —
  this, not provider registration, is the root cause of the Docker 500s).
  New repair migration `2026_09_09_072354_ensure_timescale_objects` recreates
  all objects idempotently (2 hypertables + 10 caggs with exact realtime flags
  and refresh policies mirrored from the 06-15/08-24 migrations): scratch went
  0→2 / 0→10 with 12 policy jobs; healthy native DB untouched (still 2/10);
  backend suite green with the migration in the chain. Scratch DB dropped.]
- [ ] Manual verification: HMR edit reflects via tunnel, autofill text readable unhighlighted in light/dark

## Requirements
- `NGROK_DOMAIN` + `NGROK_UPSTREAM` required env, no hardcoded fallback; personal values live in gitignored `.env`
- `npm run ngrok` must not rebuild static assets; `npm run ngrok:build` keeps the build-then-serve flow
- Autofill must not rely on `-webkit-text-fill-color: inherit` (inherits wrong/transparent); must not fight global CSS with inline arbitrary classes
- No `npm run build` while user is on HMR dev server

## Decisions
- Both Herd and Docker dev flows preserved; Docker is the simpler/recommended path

## Deferred / Skipped (known gaps)
- None.

## Verification
- `node -c scripts/ngrok.js`, `node -c scripts/ngrok-build.js`: passing
- docs `npx tsc -b`: passing (no `vite build` — user on HMR dev server)
- 2026-09-07: fixed backend-wait error text (90s→180s to match 180-poll gate); moved `ngrok-build.js` env validation after `loadEnvIntoProcess`; Herd Host-rewrite condition now also matches `server-monitoring-system.test`
- 2026-09-07: autofill fix re-applied after user revert — robust global CSS (`currentColor` + transparent inset shadow, all states) in both `frontend/src/index.css` + `docs/src/index.css`, Tailwind autofill utilities on `floatingInput.tsx` + docs `input.tsx`; docs `npx tsc -b` passing, no `vite build` (HMR live)
- 2026-09-07: `inherit`/`currentColor` resolved to Chrome dark default (text highlight-only) → switched to explicit `-webkit-text-fill-color: #ffffff !important` + `99999s` background delay in both index.css files and both input components; docs `npx tsc -b` passing
- 2026-09-07: hardcoded `#ffffff` breaks light mode → fill now tracks `text-foreground` via `var(--foreground) !important` (defined in `:root` + `.dark` in both CSS files); component utilities point at `var(--foreground)`; global `!important` rule wins over Chrome default; docs `npx tsc -b` passing
- 2026-09-07: tunnel install commands baked `http://localhost:8000` — root cause: `compose.yaml` hardcoded `APP_URL` as real container env, and `createImmutable` lets real env beat the bind-mounted `.env` that `ngrok.js` rewrites, so `env('APP_URL')` in `ProvisioningService` never saw the tunnel URL. Fix: `APP_URL: ${APP_URL:-http://localhost:8000}` in `compose.yaml` + `ngrok.js` sets `process.env.APP_URL` BEFORE `compose up` (verified via `docker compose config` both ways). Also proxied agent paths (`/install`, `/uninstall`, `/detach`, `/agent`, `/MonitorAgent.exe`) in `frontend/vite.config.ts` — without them the tunneled installer URL would 404 at Vite. Needs: `npm run ngrok` restart (recreates app container + Vite) + regenerate provision token (old commands baked the stale URL).
- 2026-09-07: tunnel agent installs downloaded ngrok's browser interstitial (ERR_NGROK_6024) — `irm` sends a browser-like UA. Fix per operator: `NGROK_SKIP_BROWSER_WARNING` env var (not hardcoded) gates the bypass header in all command builders (`WindowsCommand::make` covers install/uninstall/detach Windows; 4 Linux curl spots in `ProvisioningService` + `ServerData` uninstall/detach); `FILTER_VALIDATE_BOOLEAN` so `"false"` stays false. Follow-up same day: regenerate's Linux command flashed the header then lost it — 5th builder missed (`ServerData::fromModel` rebuilds `activeProvisionDetails` from the stored token on every detail refetch, overwriting the fresh response); same conditional applied there. Windows was unaffected because its stored rebuild
already goes through `make()`. Follow-up: double-quoted hashtable keys are stripped by Windows argv parsing before PowerShell sees them (`Missing '=' operator after key`) — switched to single-quoted keys, verified PARSE CLEAN via the PowerShell Parser API on the exact emitted one-liner. Wired: `compose.yaml` interpolates (`:-false`), prod overlay pins `"false"`, `ngrok.js` exports `=true` before `up` + writes `.env` for Herd. Tests: new `tests/Unit/WindowsCommandTest.php` (3 tests, pass, no DB); Pint clean on touched files. Needs: `npm run ngrok` restart + regenerate provision token.
- 2026-09-07: `reset-db.js` logs the target DB every run and prompts `[y/N]` only on the Docker path (`--yes`/`-y`/`--force` skips); detection uses `ps -q` so a defined-but-stopped stack no longer misdetects as running; `node -c` passing (never executed — it wipes data)
- 2026-09-07: reset hit `pg_dump` v15 (app image) vs server v17 mismatch on `schema:dump` — `dumpSchema()` now uses the postgres service's own version-matched `pg_dump` on the Docker path and never fails the reset (warn + continue so `system:monitor` still runs); `node -c` passing
- 2026-09-07: `npm run ngrok` stuck in backend-wait while Docker "looked up" — app container was mid cold boot (`composer install` + migrate, finished 07:22:18, now 200 OK on `/api/health`). No port conflict (only `com.docker.backend` + `wslrelay` on :8000). Bumped backend gate 180s→600s (Windows bind-mount composer runs exceed 3 min). Bonus: Docker DB now has all **10 caggs** — the resetdb reseed closed the missing-aggregates issue; server-detail 500s should be gone.
- 2026-09-08: file-activity log showed only directory-`modified` rows for the repo root (never individual files) — dir mtimes churn as a side effect of children changing. Fix in agent `emitFile` (`resources/agent/go/fswatch.go`): drop `isDir+modified`, keep dir create/delete/rename; new `TestWatcherSkipsDirectoryModified` covers all three branches; `go test ./...` + `go vet` clean. Needs `npm run compileagent` + agent reinstall to take effect on running agents. Side finding: Docker DB seeds Linux watched paths (`/root/...`) which a Windows agent can never watch (log spam every 15s); native DB has the correct Windows paths.
- 2026-09-08: docs now state the `.env`-vs-container precedence rule explicitly (new warning callout in the env-files section, both copies synced, `tsc -b` clean): compose `environment:` is real OS env and `createImmutable` lets it beat every file, so `.env` edits reach Herd but never a running container — use `${VAR:-default}` interpolation + recreate instead.
- 2026-09-08 follow-up: the `emitFile` guard never fired on Windows — `parseWinEvents` hardcoded `isDir:false` for modify events, so dir-mtime bumps arrived indistinguishable from file writes (proven live: 05:35 dir rows post-v2.1). Fixed at the source (`isDirOrFalse(full)` for `FILE_ACTION_MODIFIED`, mirroring create/renameNew) + `TestParseWinEventsModifyDirReportsIsDir` with a hand-crafted `FILE_NOTIFY_INFORMATION` buffer; rebuilt to v2.2 (broadcast to 1 agent). Local agent (PID 22784) still runs pre-fix code — needs a restart to load the new binary.
- 2026-09-08 verified live: auto-update DOES work — v2.1 cycle (notified 13:27:28 → PID 22784 born :30) and v2.2 cycle (notified 13:43:37 → PID 20684 born :39) both show download+swap+restart in agent.log. Post-restart probe (Downloads scratch create+delete) arrived as file rows with zero directory-modified rows — fix confirmed end-to-end. Note: my manual `Start-Process` briefly created a duplicate agent (self-exited); do not start agents by hand.
- 2026-09-08 cleanup: removed 6 `hmr-probe-*` test rows + 102 exact-duplicate rows from the duplicate-agent window (one copy kept each; 3608 rows remain).
- 2026-09-08 sanitize: deleted all 40 `is_directory` rows (build-output `created` dirs); re-probed (Downloads scratch create+delete) — file `created`/`modified`/`deleted` rows arrived, `isdir=0` across the whole fresh batch, dir count still 0. File-only reporting confirmed live.
- 2026-09-08 matrix test (`fwprobe-142311` in Downloads): dir create → `created isdir=1` ✓; file create/edit → file rows only, **no dir row on file edit** ✓; dir rename → `renamed` with dst ✓; file+dir delete → both logged ✓. 7 rows, all correct. Known cosmetic wart (pre-existing): dir rename/delete arrive `isdir=0` (Windows backend hardcodes the flag; only modify path was fixed to stat). Still open: every event lands ~2-3× (doubled timestamps persist with a single process running — likely queue-retry with fresh UUIDs, not dual reporters).
- 2026-09-07: Ctrl+C shutdown printed every line twice (each container "Stopped" 2×) — two `ngrok.js` processes were alive concurrently (stale run overlapped the current one; the early-returning PS prompt makes this easy to trip). Fix: `.ngrok.pid` single-instance guard (refuses to start while another `ngrok.js` PID is alive with matching command line; crash-safe via liveness check; gitignored); lock released in `cleanup()`; failure exits routed through `cleanup()`.
- 2026-09-07: docs sweep — README + docs site (both copies, kept in sync, `tsc -b` clean) now match the repo: per-prereq download links (Herd/Node/redis-windows/PG+Timescale/Git/Go/Typst/Docker Engine), `install-redis:windows` instead of redis.io, WSL2 note, HMR ngrok flow + `ngrok:build` + full-URL env + regenerate-token + single-instance/stop notes, `tim` (README + install callout), auto-detect `resetdb`, `APP_DOMAIN` in secrets, split-brain 5432 warning, repo-map fixes (`npm run docs` never existed; added ngrok/reset scripts), "admin account" → `user/user123`.
- 2026-09-07: `NGROK_UPSTREAM` in `.env` hijacked plain `npm run dev` — entry.js loads `.env` into env, so frontend Vite proxied `/api` to dead `:8000` in Herd mode (`ECONNREFUSED /api/v1/refresh`). Fix: proxy target now reads `VITE_BACKEND_URL`, exported only by `ngrok.js` for its spawned Vite; default stays Herd hostname.
- 2026-09-07: ngrok shutdown rework — (1) removed `compose down` on exit entirely (was nuking postgres each stop), then switched to `compose stop` (frees ~300-500MB idle RAM, keeps containers/volumes, fast restart); Herd path stops nothing. (2) Vite spawns as plain `node <viteBin>`, no shell — kills the `cmd.exe` "Terminate batch job (Y/N)?" hang. (3) Signal handlers + child tracking hoisted to top of `main()` so mid-build Ctrl+C cleans up. (4) `killTree` verifies via `tasklist` that a PID is `node.exe`/`ngrok.exe` before taskkill (operator reports powershell.exe itself dying with exit code 2 on Ctrl+C — structural cause unconfirmed; isolation test pending: run `node scripts/ngrok.js` directly to rule out the outer npm/cmd wrapper). (5) Output: dotted `statusLine()` + blank-line phases + Vite readiness gate + Vite-style colors (TTY-aware); compose streams per-service lines again.
- Remaining (needs live machine): `npm run ngrok` end-to-end, HMR edit via tunnel, autofill readability light/dark, `migrate:fresh` hypertable/cagg checks

## Active Subtask

**Item:** Fix `scripts/ngrok.js`: Docker check/auto-start, correct backend target, Ctrl+C stops everything

**Status:** [•] in progress (code complete, live-run verification pending)

### Working State
- Autofill final form applied: `var(--card)` / `var(--card-foreground)` + 5000s transition in `frontend/src/index.css` and `docs/src/index.css`; inline Tailwind autofill classes removed from `floatingInput.tsx` (was already clean) and `docs/.../input.tsx`.
- `scripts/ngrok.js` rewritten: backend chosen by `NGROK_UPSTREAM` (not Herd-PHP presence); Docker path checks `docker info`, opens Docker Desktop on win32, polls daemon, `compose up -d`, polls `:8000/api/health` (600s gate); Herd path probes `${upstream}/api/health`. Ctrl+C kills tunnel + Vite + `compose stop` (never `down`); handlers registered before any blocking phase; `killTree` image-verified. Failure paths kill spawned children.
- Removed the local `php artisan serve :8000` branch (container owns :8000 in Docker path — it caused EADDRINUSE/masking risk).

### Decisions
- Ctrl+C stops ngrok + Vite always, then `docker compose stop` (never `down`): frees the ~300-500MB idle footprint for multi-project juggling while keeping containers/volumes/images, so the next run restarts in seconds with zero data loss. Herd path stops nothing (no stack was started).
- Vite dev server spawns as plain `node <viteBin>`, no shell (the `npm.cmd` wrapper is a cmd.exe batch process that prints "Terminate batch job (Y/N)?" and hangs on Ctrl+C; plain node exits cleanly via taskkill).
- Signal handlers + child tracking register at the top of `main()`, so Ctrl+C mid-build (docker up, backend wait, tunnel wait) kills spawned children before exit instead of orphaning them.
- `docker compose up -d` streams per-service startup lines (realtime status is signal — briefly silenced, then restored per operator feedback).
- Output uses fixed-width dotted status lines (`[ngrok] Backend :8000 ......... READY (2s)`) with blank lines between phases; tunnel gated on Vite readiness poll (`:5173`, 60s) so the smoke test never races first compile.
- 2026-09-07 live-run verified end-to-end: daemon RUNNING → stack UP → backend READY (2s) → Vite READY (3s) → tunnel LIVE → smoke test 200 OK; post-timeout check showed zero orphan processes, stack healthy.
- URL table + success statuses use Vite-style raw ANSI colors (cyan URLs with `➜` markers, green LIVE/READY/UP/RUNNING/OK); auto-disabled when piped or `NO_COLOR` is set, so log files stay clean.
- Dev compose `app` serves via FrankenPHP non-worker (same Caddyfile as prod) — dev/prod parity; worker mode still pending a state-leak audit (audited in dev first).
- 2026-09-07 TESTED: dev image builds clean (incl. `pecl xdebug` on frankenphp base); first boot failed on invalid `servers { listen :8000 }` block in the shared Caddyfile (that option doesn't exist — pre-existing in prod file, never booted) → removed, `Server: FrankenPHP Caddy` header confirms, Xdebug present, `user/user123` login OK, `/api/health` 200.

### Files
- `scripts/ngrok.js`
- `frontend/src/index.css`, `docs/src/index.css`
- `frontend/src/components/ui/floatingInput.tsx`, `docs/src/components/ui/input.tsx`

### Verification
- `node -c scripts/ngrok.js`, `node -c scripts/ngrok-build.js`: passing
- docs `npx tsc -b`: passing
- Live `npm run ngrok` run: NOT yet verified (needs Docker + ngrok on operator machine)
- Diagnosed 2026-09-07: empty `docker compose ps` after failed run = script cleanup tore down self-started stack; app entrypoint needs minutes on cold boot (composer + migrate), old silent 90s gate looked hung → added progress logs + 180s gate
- Diagnosed 2026-09-07: Docker app serves :8000 with 200 on `/api/health` once warmed; stack left UP for operator's next run

### Known Issues
- `npm run ngrok` live run, HMR edit via tunnel, autofill visual check, and hypertable/cagg fresh-migrate checks all pending on operator machine.
- 2026-09-07 diagnosed (CORRECTED — earlier "genuine 404" note was wrong; it queried the native Herd postgres, not Docker): tunnel `/servers/01a06b99-bf8f…` "Server not found" is a **500 masked by the frontend**. Row EXISTS in Docker DB (server id 77 `muller-prod`, client id 6 `Christiansen-Kerluke`). Proof: Docker `app` log shows `GET /api/v1/servers/… 500` while list endpoints return 200; `detail.tsx:295` renders "Server not found." on ANY `useServer` error. Docker DB has 0 continuous aggregates (`timescaledb_information.continuous_aggregates` empty; `to_regclass(server_updates_agg_minute)` null) so `queryAggTable` throws. Extension installed + `server_updates` IS a hypertable — only the cagg definitions are missing. Port trap that caused the misdiagnosis: native `postgres.exe` owns `0.0.0.0:5432` while Docker proxy holds only `[::]:5432`, so any `127.0.0.1:5432` client (Beekeeper on 127.0.0.1, `database-query` tool, Herd Laravel) reads the NATIVE db (93 servers), while the tunnel reads the Docker db (102 servers). `localhost` may resolve to `::1` → Docker db. Two divergent databases on one port — stop one postgres when working in the other flow.
- 2026-09-07 diagnosed: tunnel `/telescope` 404 is structural — HMR flow tunnels to Vite :5173 which proxies only `/api` + `/sanctum`; `/telescope` never reaches Laravel. Use backend-direct URL instead (`http://127.0.0.1:8000/telescope` on Docker). FIX APPLIED: `/telescope` proxy entry added to `frontend/vite.config.ts` (needs Vite restart to take effect — operator is on live HMR).

## Context Summary
- ngrok HMR flow is code-complete; autofill uses explicit theme vars with no inline conflicts. Remaining work is all live-machine verification: run `npm run ngrok`, edit a frontend file, confirm HMR via tunnel URL; check login autofill readability in light/dark; run `migrate:fresh` and query `timescaledb_information.hypertables` / `continuous_aggregates`.
