---
status: active
created: 2026-08-26
started: 2026-08-26
adr: 0004 (docs/architecture/0004-audit-subsystem.md — Accepted)
---

# File Activity Auditing + Agent Lifecycle Auditing

## Objective

Add an auditable record of filesystem activity on monitored servers and of the
monitoring agent's own lifecycle, without a parallel config/log/sync system.
File activity and agent lifecycle events are conceptually separate but both
associated with the correct server + agent and both surfaced through the Logs
system. Watched paths are database-backed configuration delivered to the agent
through the *existing* configuration mechanism (auth response + `config.update`
WebSocket broadcast), not hardcoded behavior.

## Grounding (verified in repo)

- Agent is **Go** in `resources/agent/go`. Config sync: `ws.go` `configUpdatePayload`
  (carries `PortFilter`/`ProcessFilter`/`NetworkFilter`) + `runtime.go` `AgentRuntime`
  (`Upsert`/`config`). Heartbeat: `main.go` `sendHeartbeatStep`. HTTP delivery:
  `client.go` `sendWithRetry`/`doOnce` (durable retry, `waitForInternet`). Service
  lifecycle: `service_windows.go` `monitorService.Execute` handles `svc.Stop|svc.Shutdown`
  by closing `stopChan` and `<-done`. Instance dir (Windows):
  `C:\ProgramData\MonitorAgent\instances\<uuid>\`; Linux `/var/lib/monitor-agent/instances/<uuid>/`.
- Backend is **Laravel** (PHP 8.5, Pest, Pint). `Setting` is key/value
  (`SettingSeeder` uses idempotent `updateOrInsert`). `ActivityLogController` +
  `routes/api/v1/activity-logs.php` (all under `auth:jwt`) serve Logs. `Activity`
  model is `server_id`/`agent_id`-scoped (`type`, `description`, `metadata` JSON) —
  used for existing activity rows. `CustomActivityLog` has `type`
  (`activity`/`server_health`/`agent`/`billing`) and is the Logs backend today.
- No existing file-watcher, durable event queue (only `pendingCompleted` command
  results), or `WatchedPath`/`FileActivity*`/`AgentLifecycle*` model exists.
- Agent identity = installation UUID + OS keystore RSA key; agent endpoints are
  challenge/response signed. Reuse this for any new agent→backend endpoint.

## Implementation Tasks

### Backend — schema & models [DONE]
- [x] Migration: `file_activity_logs` table — `id`, `uuid` (unique string, idempotency),
      `server_id` (FK, nullable), `agent_id` (FK, required), `action`
      (created/modified/moved/renamed/deleted), `file_name`, `source_path`,
      `destination_path` (nullable), `is_directory` (bool), `username`/`process_name` (nullable),
      `process_id` (nullable), `occurred_at` (timestampTz), `created_at`/`updated_at`. Indexes on
      `server_id`, `agent_id`, `action`, `occurred_at`, `source_path`.
- [x] Model `FileActivityLog` (HasUuids; guarded=[]; casts is_directory bool, occurred_at datetime).
- [x] Migration: `agent_lifecycle_events` table — `id`, `uuid` (unique string), `server_id` (FK, nullable),
      `agent_id` (FK, required), `event_type` (started/stopping/stopped/unexpectedly_disconnected),
      `occurred_at`, `created_at`/`updated_at`. Indexes on `server_id`, `agent_id`, `event_type`, `occurred_at`.
- [x] Model `AgentLifecycleEvent` (HasUuids; scopes: `started`, `graceful`, `unexpected`).
- [x] Migration: `watched_paths` table — `id`, `path`, `scope` (agent/server),
      `server_id` (FK nullable, required when scope=server), `enabled` (bool default true),
        `recursive` (bool default true), `description` (nullable), `created_at`/`updated_at`.
        Unique on `path` + `scope` + `server_id`. Seeder is OS-aware: on Windows it
        seeds `C:\ProgramData\MonitorAgent` + the operator's `Herd`, `Downloads`,
        `Documents`, `Desktop` (from `USERPROFILE`); on Linux it seeds
        `/var/lib/monitor-agent` + the operator's `Herd`, `Downloads`, `Documents`,
        `Desktop` (from `HOME`) — all agent-scoped recursive, idempotent.
- [x] Migration `2026_08_27_000001_add_exclude_patterns_to_watched_paths.php` adds
        `exclude_patterns` (json, nullable) — gitignore-style globs (e.g. `*.log`) that
        the watcher skips. Model cast `array`; `WatchedPathResource` returns `[]` when null;
        `WatchedPathController` validates `exclude_patterns` (array) + `exclude_patterns.*`
        (string, max 512).

### Backend — Settings / watched-path config [DONE]
- [x] `WatchedPath` model + factory + `WatchedPathSeeder` (idempotent `updateOrInsert` by natural key),
      hooked from `DatabaseSeeder`.
- [x] API endpoints (`routes/api/v1/watched-paths.php`, `auth:jwt`, admin-gated like
      `SettingController::update`): list / store / show / update / destroy. Validation:
      `scope` in [agent,server]; `server_id` required+exists when scope=server; `enabled`,`recursive` bool.
      (Path existence/accessibility check deferred — graceful, see Deferred.)
- [x] On watched-path create/update/delete: trigger config re-sync via `AgentConfigUpdated`
      broadcast (extends the per-server config payload with `watched_paths`).
      [2026-09-08: settings-summary deferral re-confirmed — the settings File
      Activity page already fetches watched paths via its own `useWatchedPaths`
      hook, so a summary inside the settings payload would be redundant.]
- [ ] Settings UI backend: return watched-path summary inside the settings payload. (Deferred — minor; frontend section tracked separately.)

### Backend — ingestion endpoints [DONE]
- [x] `POST /api/v1/agent/audit/file-activity` (agent-authenticated, signed): bulk file events with
      stable `uuid`. Idempotency: skip rows whose `uuid` exists. Ownership: resolve `server_uuid` to a
      server the agent owns; skip mismatched association (never attach wrong server/agent).
- [x] `POST /api/v1/agent/audit/lifecycle` (agent-authenticated, signed): `{event_type, server_uuid?,
      occurred_at, uuid}`. Idempotent by `uuid`. Backend-detected `unexpectedly_disconnected` covered by §10.
- [x] Eloquent API Resources `FileActivityLogResource` / `AgentLifecycleEventResource` /
      `WatchedPathResource`, following existing resource conventions.

### Backend — Logs API & filtering [DONE]
- [x] `AuditController` with `fileActivity()` and `agentLifecycle()` endpoints under `auth:jwt`:
      pagination, filters `server_id`/`server_uuid`, `agent_id`, `action`/`event_type`,
      `path` (LIKE source/dest), date range (`occurred_at_from`/`occurred_at_to`). Order by `occurred_at` desc.
- [x] Reuse existing JWT authorization.
- [x] Ownership enforced at ingestion; responses follow existing Logs JSON convention (top-level arrays).

### Backend — unexpected disconnect detection [DONE]
- [x] `MonitorServer` offline transition records `AgentLifecycleEvent` `unexpectedly_disconnected`
      only if no `stopping`/`stopped` event exists for that agent within the grace window
      (`offline_threshold * 4`). Graceful shutdown wins over timeout.

### Agent (Go) — filesystem watcher [DONE]
- [x] New `fswatch.go`: cross-platform watcher using native OS notifications, **no new dependency** (user
       chose `golang.org/x/sys` directly). `fswatch_windows.go` (build-tagged `windows`) uses
       `ReadDirectoryChangesW`; `fswatch_linux.go` (build-tagged `linux`) uses inotify. Windows uses native
       recursive watch; Linux recurses subdirs on `IN_CREATE|IN_ISDIR`.
- [x] Watch config comes from `AgentRuntime` (`WatchedPath` list synced via auth/config.update). Recursive +
       enabled toggle honored. Nonexistent/inaccessible paths logged + skipped in `syncWatches` (15s rescan),
       never fatal. A failed path does not stop the agent.
- [x] Logical events: created / modified / deleted (native); moved / renamed via in-agent correlation (see below).
       Metadata: filename, source_path, destination_path, is_directory captured. username/process_name/process_id
       are null for now (best-effort deferred per ADR-0004). No file-access/read events.

### Agent (Go) — move/rename correlation [DONE]
- [x] `fswatch.go` keeps a short-lived pending buffer keyed by parent dir within a 250ms window. A
       `renameOld`+`renameNew` pair → `renamed` (same dir) or `moved` (different dir). A `renameOld` without a
       partner within the window, or a `create` arriving shortly after a `renameOld` in the same dir → falls
       back to deleted / moved. Backend dedup is the backstop.

### Agent (Go) — durable event queue [DONE]
- [x] New `eventqueue.go`: append events as JSON-lines to `<instanceDir>/file_events.queue` (excluded from
       self-auditing). Each line is a full `AuditEvent` JSON with stable `uuid`.
- [x] Delivery: `Drain` clears the file, sends via `client.sendAuditEvents` (splits file-activity vs lifecycle,
       reuses `sendWithRetry` + `ensureSession`/401-refresh + `waitForInternet`). Failed events are re-enqueued.
       Bounded by `AgentRuntime` enable-filter; the queue file is the durability layer (crash leaves events on disk).

### Agent (Go) — config sync integration [DONE]
- [x] `models.go` `WatchedPath` + `AuthConfig.WatchedPaths`; `client.go` `parseAuthResponse` parses
       `config.watched_paths`; `ws.go` `configUpdatePayload` gains `WatchedPaths` and `handleConfigUpdate`
       calls `runtime.SetWatchedPaths`. `AgentRuntime` gains `SetWatchedPaths` / `EffectiveWatchedPaths`
       (agent-scoped + per-server, enabled only) + `normalizeWatchPath` (`%ProgramData%` expansion, clean).
- [x] Live apply: `syncWatches` starts/stops watches for the effective set every 15s; disabled/removed paths
       simply stop producing events. Paths normalized + deduped; never monitor the whole filesystem.

### Agent (Go) — self-monitoring & lifecycle [DONE]
- [x] Default agent-scoped path `%ProgramData%\MonitorAgent` seeded backend-side; on the agent it expands via
       `normalizeWatchPath`. `isExcluded` drops high-frequency agent-owned files from self-auditing: `agent.log`,
       `crash.log`, `startup.log`, `file_events.queue`.
- [x] Lifecycle emission in `runAgentLoop`: `started` per server on startup; on `stopChan` → `stopping`,
       flush buffered watcher events, `stopped`, then final `Drain`. Best-effort only; unexpected termination
       is covered by backend heartbeat-timeout (§10).
- [x] Exclude patterns honored: `WatchedPath` gains `ExcludePatterns []string` (parsed in
       `client.go` `parseAuthResponse` from `exclude_patterns`); `runtime.go` adds `WatchedPathForPath`;
       `fswatch.go` `emitFile` skips a path when `matchAny(wp.ExcludePatterns, path)` matches base or full
       path via `filepath.Match` (invalid pattern = no match, so a typo only skips that one rule).

### Frontend — Settings (watched paths) [DONE]
- [x] New Settings section "File Activity Monitoring" (`/settings/file-activity`): lists watched paths with
       status (enabled/recursive/scope/path/description), add/edit dialog (incl. an Exclude patterns textarea,
       one gitignore-style pattern per line), delete. An Exclude column shows up to 2 patterns. Defaults note
       marks `%ProgramData%\MonitorAgent` as monitored-by-default. Calls the watched-path CRUD endpoints via
       react-query mutations (`useAuditLogs.tsx`).

### Frontend — Logs page [DONE]
- [x] Logs page gains two tabs: **File Activity** (Created/Modified/Moved/Renamed/Deleted; Moved/Renamed
       show `Source → Destination`; row → detail modal with full metadata: user, process, pid, is_directory)
       and **Agent Lifecycle** (Started/Stopping/Stopped/Unexpectedly Disconnected, visually distinct).
- [x] Filters: action/event_type (select), path (text, file-activity only), date from/to (both tabs),
       with Clear. Reuse the Logs tab/table conventions.

### Tests [PARTIAL]
- [x] Backend (Pest): migrations + models + factories; seed idempotency; ingestion endpoints (validation,
       auth, server/agent ownership rejection, idempotent uuid); Logs API pagination/filtering; unexpected
       disconnect detection (no double event when graceful shutdown present). → `tests/Feature/AuditTest.php` (11 pass).
- [x] Agent (Go): `audit_test.go` — `uuidV4` format; queue round-trip + retry-on-failure; watched-path
       `%ProgramData%` expansion + `EffectiveWatchedPaths` enable filter; move/rename correlation; JSON shape.
       `go build`/`go vet`/`go test` pass on `windows` and cross-build on `linux`.
- [x] Frontend: type-check (`tsc -b`) clean for all audit files; eslint clean. (No dedicated component test
       added yet — the app has no existing write-path test pattern to mirror.)
       [2026-09-08: `tsc -b` clean; `eslint src/pages/system-logs/` clean after
       one useless-escape fix in `logHelpers.ts`. Pre-existing errors remain in
       unrelated files: `settings/profile/*` no-explicit-any ×5, settings
       exhaustive-deps warnings ×2, docs search ref-during-render ×2.]

### Docs [DONE 2026-09-08 — user-guide Logs sections, no duplication]
- [x] Update relevant docs (NOT duplicate): file activity monitoring, watched-path config, default paths,
      `%ProgramData%\MonitorAgent` monitoring, supported events, agent lifecycle events, graceful vs
      unexpected termination, delivery/retry, platform-specific limits (file-access not monitored;
      username/process best-effort on Linux; fsnotify dependency if chosen).
      → `DocsLogsContent` gained "File Activity" + "Agent Lifecycle" sections;
      nav description updated. Verified against `WatchedPathSeeder` defaults and
      endpoint validation (`in:created,modified,moved,renamed,deleted` /
      `in:started,stopping,stopped,unexpectedly_disconnected`).

## Requirements

1. **File activity monitoring** — native OS notifications (no polling), events: created/modified/moved/
   renamed/deleted; no read/access events by default.
2. **Watched-path config** — DB-backed, not hardcoded; Settings section; per path: path/enabled/recursive/
   description/scope; seeded default `%ProgramData%\MonitorAgent`; delivered via existing config mechanism;
   add/disable/remove applied live; normalize + dedupe + validate; graceful on bad paths.
3. **Agent self-monitoring** — `%ProgramData%\MonitorAgent` always audited; exclude high-frequency
   agent files (logs/temp/queue) from the feedback loop.
4. **File event details** — server_id, agent_id, timestamp, action, file_name, source_path, destination_path,
   is_directory; + username/process_name/process_id where reliably available.
5. **Move/rename correlation** — merge low-level events into logical Moved/Renamed (source→dest / old→new);
   tolerate notification timing/ordering.
6. **Durable agent queue** — local JSON-lines queue → retry → ack on success → no duplicates → bounded;
   consistent with agent on-disk/security conventions.
7. **Backend storage + API** — persistent models (server+agent scoped); list API with pagination, server/
   agent/action/date/path filters; strict ownership validation; standard response/validation/auth/errors.
8. **Logs page** — file activity under Server Activity; concise rows; Moved = Source → Destination; detail
   view; filters (server/action/date/path); lifecycle events also shown.
9. **Agent lifecycle auditing** — started/stopping/stopped/unexpectedly_disconnected; graceful stop handler
   sends stopping + flushes + stopped; backend heartbeat-timeout detects unexpected.
10. **Unexpected disconnect** — distinguish graceful vs unexpected via heartbeat timeout; never mark
    unexpectedly_disconnected if a valid graceful shutdown event exists.
11. **Audit semantics** — file activity vs lifecycle conceptually separate; both server+agent scoped, both
    in Logs.
12. **Security/privacy** — metadata only, never file contents; respect existing auth/access control for audit data.
13. **Testing** — agent/backend/frontend coverage enumerated above.
14. **Documentation** — update existing docs only.
15. **Implementation quality** — follow existing architecture (reuse config sync, queue, auth); modular for
    future audit types; logical over raw events; correct under multi-path/overlap/live-change/backend-down/
    restart/normal-shutdown/unexpected-termination.

## Decisions (record; promote to ADR-0004 on start)

- [ADR-0004 proposed] New audit subsystem uses **two dedicated tables** (`file_activity_logs`,
  `agent_lifecycle_events`), both `server_id`/`agent_id`-scoped, surfaced through the Logs API/UI —
  keeps file activity and lifecycle conceptually separate while reusing the Logs frontend/authorization.
- [ADR-0004 proposed] Watched paths are delivered through the **existing** config mechanism: extend the
  auth response + `config.update` payload (`configUpdatePayload`) with `WatchedPaths`, mirrored into
  `AgentRuntime` — no new sync channel (reuse port_filter delivery pattern).
- [ADR-0004 proposed] Agent durable queue is a **JSON-lines file** in the instance dir with per-event
  `uuid`; backend enforces idempotency by `uuid`; queue is bounded (cap + drop-oldest). Reuses
  `client.sendWithRetry`/`waitForInternet`.
- [ADR-0004 resolved] Native OS notifications via `golang.org/x/sys` directly — **no new dependency**
   (user chose this over `fsnotify`). `fswatch_windows.go` (`ReadDirectoryChangesW`, build-tagged `windows`)
   + `fswatch_linux.go` (inotify, build-tagged `linux`); shared `fswatch.go` (correlator + queue glue).
- Watched-path scoping: `scope` ∈ {agent, server}; the default `%ProgramData%\MonitorAgent` is agent-scoped
  and always-on (self-monitoring, never excluded as a system dir).
- Self-auditing exclusion list (agent-owned high-frequency files) is configurable; logs/temp/queue excluded.
- Move/rename correlation happens **in-agent** (short window) with backend dedup as backstop.

## Deferred / Skipped (known gaps)

- [x] **Linux username/process attribution** — best-effort/null where the platform cannot reliably supply it
      (revisit if a privileged audit source becomes available).
      [2026-09-09 DONE: `owner_linux.go`/`owner_windows.go` + one line in
      `emitFile` — Linux fills `username` from file-owner uid lookup (empty on
      deleted files/unknown uids); Windows stays null by design. inotify
      cannot report the actor; owner is best-effort signal.]
- [ ] **`stopped` reliable send** — only best-effort on graceful shutdown; unexpected termination relies on
      backend heartbeat-timeout (by design, cannot be fixed in-agent).
- [x] **Watcher dependency** — resolved: direct `x/sys`, no new dependency (was the deferred fsnotify-approval gap).
- [x] **Per-server watched paths UI granularity** — initial UI may expose agent-scoped + simple server scope;
      advanced per-server assignment deferred if it complicates the Settings UX.
      [2026-09-09 VERIFIED present: `settings/file-activity.tsx` has agent/server
      scope toggle + server picker.]

## Verification

- `go build ./...` + `go test ./...` in `resources/agent/go` (incl. new watcher/queue/lifecycle tests).
- `vendor/bin/pint --dirty --format agent`.
- `php artisan test --compact` (new FileActivityTest, LifecycleTest, WatchedPathTest, LogsFilterTest).
- `npm run types` / frontend typecheck + `php artisan scramble:export` if API schema changes.
- `scripts/build-agent.ps1` to rebuild agent binaries after Go changes.
- Manual: run agent, create/modify/move/rename/delete under a watched path → confirm rows in Logs;
  stop service gracefully → stopping+stopped; kill agent → unexpectedly_disconnected via heartbeat timeout.

## Active Subtask

**Item:** Bug fixes (agent → backend ingestion crashes) + Exclude patterns (gitignore-style) for watched paths.

**Status:** [x] completed & verified.

### Fixes
- **Lifecycle 422:** agent sent `{"events": null}` when no lifecycle events were pending → backend required
  `min:1`. Root cause in `client.go` `sendAuditEvents`: it always POSTed both batches. Fixed by skipping
  empty batches (file + lifecycle) so the agent never sends a null/empty array. Verified: `go build/vet/test`
  pass; the remote agent (`LAPTOP-RPL0DQR0`) will stop emitting the 422 once the rebuilt binary is deployed.
- **File-activity 500:** `Undefined array key "server_uuid"` at `AuditController::ingestFileActivity` — agent
  sends agent-scoped file events WITHOUT a `server_uuid` key. Root cause fixed with `$event['server_uuid'] ?? null`
  (agent-scoped rows correctly get `server_id=null`). Pint passed.

### Feature
- `exclude_patterns` (gitignore-style) added end to end: migration + cast + resource + controller validation
  (backend) → `WatchedPath.ExcludePatterns` + `WatchedPathForPath` + `matchAny` in `emitFile` (agent) →
  settings dialog textarea + list column + `WatchedPathData/Input` types (frontend). Regenerated OpenAPI types.

### Working State
- Backend complete + verified (`tests/Feature/AuditTest.php`, 11 passing; Pint clean). `AuditController`
  Logs list methods gained explicit `validate()` rules so the OpenAPI schema exposes the full filter set
  (server/agent/action/event_type/path/date/per_page) — regenerated `frontend/src/api/{api.json,schema.d.ts}`
  and `frontend/src/types/models.ts` via `npm run types`.
- Agent Go complete + verified: `go build`/`go vet`/`go test` pass for `windows`; cross-build for `linux`.
- Frontend complete: new `useAuditLogs.tsx` (query + CRUD mutations + types), `FileActivityTable.tsx`,
  `LifecycleTable.tsx`, `AuditDetailModal.tsx`, two new Logs tabs with filters, `pages/settings/file-activity`
  CRUD page, Settings index link, and router route `/settings/file-activity`. `tsc -b` reports no errors in
  any audit file (pre-existing type errors exist only in `components/docs/*`, unrelated to this work).

### Decisions
- `uuid` columns are `string(64)` (not Postgres `uuid`); idempotency by unique `uuid`. See ADR-0004.
- Logs/WatchedPath API responses: top-level JSON arrays (no `data` wrapper).
- Agent auth reuses `AgentAuthService::authenticate` (signed session Bearer); status must be `active`.
- Watcher uses `golang.org/x/sys` directly (no `fsnotify`); zero new dependency.
- Frontend write flows use standard react-query `useMutation` + `invalidateQueries` (the app had no prior
  mutation pattern to mirror); the generated `api` client's POST/PUT/DELETE are used directly.

### Files
Backend: `database/migrations/2026_08_26_000001_create_audit_tables.php`, `app/Models/{FileActivityLog,AgentLifecycleEvent,WatchedPath}.php`, `app/Http/Resources/{FileActivityLogResource,AgentLifecycleEventResource,WatchedPathResource}.php`, `app/Http/Controllers/Api/V1/{AuditController,WatchedPathController}.php`, `database/factories/{FileActivityLogFactory,AgentLifecycleEventFactory,WatchedPathFactory}.php`, `database/seeders/WatchedPathSeeder.php` (+ `DatabaseSeeder` hook), `routes/api/v1/{audit,watched-paths}.php` (+ `api.php`), `app/Services/AgentAuthService.php`, `app/Events/AgentConfigUpdated.php`, `app/Jobs/MonitorServer.php`.
Agent Go: `fswatch.go`, `fswatch_windows.go`, `fswatch_linux.go`, `eventqueue.go`, `audit_test.go`, and edits to `models.go`, `client.go`, `ws.go`, `runtime.go`, `main.go`, `util.go`, `go.mod`.
Frontend: `src/pages/system-logs/hooks/useAuditLogs.tsx`, `src/pages/system-logs/components/{FileActivityTable,LifecycleTable,AuditDetailModal}.tsx`, `src/pages/system-logs/index.tsx` (tabs+filters), `src/pages/settings/file-activity/index.tsx`, `src/pages/settings/index/index.tsx` (link), `src/router.tsx` (route). Regenerated `src/api/api.json`, `src/api/schema.d.ts`, `src/types/models.ts`.
Tests: `tests/Feature/AuditTest.php`, `resources/agent/go/audit_test.go`.

### Verification
- `php artisan test --compact tests/Feature/AuditTest.php` → 11 passed. `vendor/bin/pint --dirty --format agent` → passed.
- `cd resources/agent/go; GOOS=windows go build ./... && go vet ./... && go test ./...` → ok; `GOOS=linux go build ./...` → ok.
- `cd frontend; npx tsc -b --noEmit` → no errors in audit files (only pre-existing `components/docs/*` errors).

### Known Issues / Blockers
- `WatchedPathController::store` does not do path existence/accessibility checks (graceful) — deferred; `scope`/`server_id` validation enforced.
- The rebuilt agent binary must be redeployed to `LAPTOP-RPL0DQR0` for the ingestion fixes to take effect (no auto-update wired here). Rebuild: `cd resources/agent/go; GOOS=windows go build -o <dest>` (or `scripts/build-agent.ps1` if present).
- Docs update (NOT duplicate existing docs) still `[PENDING]` — optional, add when requested.

## Context Summary

The audit subsystem is complete end to end. Two server+agent-scoped streams (file activity + agent
lifecycle) are stored in `file_activity_logs` / `agent_lifecycle_events` and surfaced through the Logs API
and UI; watched paths live in `watched_paths` and are delivered to the Go agent via the existing session
`config.watched_paths` + `config.update` broadcast (ADR-0004). The agent watches those paths with native OS
notifications (`x/sys` ReadDirectoryChangesW / inotify — no new dependency), correlates move/rename in-agent,
and drains a durable JSON-lines queue (`file_events.queue`) to agent-signed ingestion endpoints (idempotent by
`uuid`). The frontend adds a Settings "File Activity Monitoring" section (watched-path CRUD) and two Logs
tabs (File Activity, Agent Lifecycle) with filters and detail modals. Unexpected-disconnect is detected
backend-side on heartbeat timeout, suppressed when a graceful stop was recorded.

Remaining (optional): the Docs update; a frontend component test (the app has no prior write-path test
pattern to mirror).

## UI Refinements (round 2) [DONE]

Frontend polish on the Logs File Activity + Agent Lifecycle tabs per review:
- **Path ellipsis in prefix + tooltip:** `FileActivityTable` path cell now uses `tailEllipsis`
  (lib/utils) so long paths keep the tail/filename visible (`…logs/laravel.log`), with a
  `title` attribute carrying the full path for hover tooltip (moved/renamed shows `src → dst`).
- **Server column is a hyperlink (no "Agent" scope):** `ServerLink` renders `server_uuid` as a link to
  `/servers/:uuid` (label = `server_name` ?? uuid). For agent-scoped events (no owning server) it now
  shows the agent's **monitored servers stacked vertically**, each a link — never the bare word "Agent".
  Backend `FileActivityLogResource`/`AgentLifecycleEventResource` gained `agent_servers` (array of
  `{uuid,name}`) from `agent.monitoredServers`; `AuditController` eager-loads `agent.monitoredServers`.
  Applied in both tables and in the detail modal's Server field.
- **Activity/Server Health/Agent LogTable columns are hyperlinked:** the `Subject` column links to
  `/servers/:logable_id` (label from `getLogSubjectLabel`); the `User` column links to `/users/:user_uuid`.
  `LogTable` now imports `Link`. (`LogDetailModal` already hyperlinked these.)

**AgentTab `api.POST` fix (correct openapi-fetch pattern):** `handleForceReinstall` and `handleDeregister`
now call `api.POST("/v1/servers/{uuid}/<action>", { params: { path: { uuid } } })` (2-arg form) instead of
the interpolated-URL / `as any` workarounds; `ForceReinstallResponse.token_expires_in` retyped `string`
to match the OpenAPI schema (field unused in UI). `tsc -b` clean for these files.

**Verification:** AuditTest 11 passed; Pint clean; eslint clean; `tsc -b` clean except pre-existing
`docs/DocsAlertsContent.tsx` errors (unrelated).
- **Detail modal scrollable:** `AuditDetailModal` DialogContent now `max-h-[90vh] overflow-y-auto`.
- **Removed non-applicable fields:** file-activity detail no longer shows Username/Process/Process ID
  (a file event has no process/owner in this implementation); missing values still render "—".
- **Pagination:** both tabs now paginate like the server Metrics process/port list (page size 10) via a
  shared `PaginationControls` (prev/next + jump-to-page + "Showing X–Y of Z"). Backend already returns
  a paginated envelope; `useFileActivityLogs`/`useAgentLifecycleLogs` now return `{ data, meta }` and
  pass `page`/`per_page`. Resources gained `server_name`.
- **Seeded exclude patterns:** `WatchedPathSeeder` now sets `exclude_patterns` (JSON-encoded) —
  `*.log`/`*.tmp` for MonitorAgent; `*.log`/`node_modules`/`.git`/`*.tmp`/`vendor` for user folders.
  Re-seeded; existing rows updated via `updateOrInsert`.

**Verification:** `php artisan test --compact tests/Feature/AuditTest.php` → 11 passed; Pint passed on
changed PHP; eslint clean on changed TSX; `tsc -b` reports no new errors (only pre-existing `docs/*`).

## Agent Logs Tabs on Server Agent tab [DONE]

Added an "agent logs" sub-tab section to the server **Agent tab** (`pages/servers/detail/tabs/AgentTab.tsx`),
rendered between the Installed Agent Properties card and the Agent Recovery & Force Reinstall card
(only when `server.agent` + `server.uuid` exist). New `pages/servers/detail/tabs/AgentLogsSection.tsx`
reuses the existing Logs table components (`LogTable`, `FileActivityTable`, `LifecycleTable`,
`AuditDetailModal`, `LogDetailModal`, `PaginationControls`) and hooks, with four tabs:

- **Server Health** — `useServerHealthLogs()` scoped client-side by `logable_id === server.uuid`.
- **File Activity** — `useFileActivityLogs({ server_uuid, page, per_page:10 })` (server-scoped).
- **Agent** — `useAgentLogs()` scoped by `logable_id === server.uuid`.
- **Agent Lifecycle** — `useAgentLifecycleLogs({ server_uuid, page, per_page:10 })` (server-scoped).

Detail modals (activity + audit) wired; activity tables keep the existing sort state. File Activity /
Agent Lifecycle use the page-mode `PaginationControls` (cursor hybrid pending per TODO 08).

**Verification:** eslint clean on new file; `tsc -b` reports no new errors (only pre-existing `docs/*`).

Git commit message file: not yet written (commit only when explicitly requested).
