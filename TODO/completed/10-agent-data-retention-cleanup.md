---
status: complete
created: 2026-09-02
started: 2026-09-02
completed: 2026-09-08
---

# Agent Data Retention Cleanup (high-volume, low-retention data)

## Objective

Auto-clean up old **high-volume, low-retention** agent data — heartbeats, their
associated metric batches/samples, and file activity events — that accumulates
over time, configurable from the Agent Settings page (default retention
**2 months / 60 days**), running on a **daily** cron schedule. Agent logs and
other important long-term records (**CRUD, install/uninstall**) are
intentionally kept.

## Grounding (verified in repo)

- Backend: Laravel PHP 8.5, Pest + Pint. `Setting` is key/value
  (`Setting::get/set`, `updateOrCreate`). Console commands live in
  `app/Console/Commands/` (auto-discovered) and are scheduled from
  `AppServiceProvider::boot()` (e.g. `uploads:cleanup` → hourly) and
  `routes/console.php` (`Schedule::command(...)`, `tokens:cleanup` → hourly).
- High-volume regular tables: `heartbeats` (received_at), `metric_batches`
  (created_at, heartbeat_id set-null on heartbeat delete) + `metric_samples`
  (recorded_at, cascade on batch delete), `file_activity_logs` (occurred_at).
- TimescaleDB hypertables `server_updates` / `server_network_stats` are ALREADY
  governed by their own retention/continuous-aggregate policies — not manually
  cleaned here.
- Kept: `activity_logs` type `agent` (`CustomActivityLog`), `activities`,
  `agent_lifecycle_events`, CRUD/install/uninstall records.
- Settings UI: `frontend/src/pages/settings/agent.tsx` (zod schema + form store),
  `frontend/src/hooks/useSettings.ts` (`SystemSettings` + `normalizeSettings`).
- API: `SettingController::update` accepts `UpdateSettingsData` (Spatie Data).

## Implementation Tasks

- [x] Backend — service: `app/Services/AgentDataCleanupService.php`
    - `retentionDays(): int` reads `Setting::get('agent_log_retention_days', 60)`.
    - `cleanup(): array` deletes heartbeats (`received_at`), metric_batches
      (`created_at`, cascade samples), and `file_activity_logs` (`occurred_at`)
      older than cutoff. Agent logs / activities / lifecycle events are NOT
      touched. Logs counts via `Log::info`.
- [x] Backend — command: `app/Console/Commands/CleanupAgentLogs.php`
    - signature `agent-data:cleanup`, calls service, returns `Command::SUCCESS`.
- [x] Backend — schedule: `AppServiceProvider::boot()` adds
    `$schedule->command('agent-data:cleanup')->daily()`.
- [x] Backend — migration: `2026_09_02_000001_add_agent_log_retention_days_setting.php`
    seeds `agent_log_retention_days` = `'60'`; down removes it.
- [x] Backend — API: `SettingController::update` now accepts an
    `App\Data\UpdateSettingsData` (Spatie Data) request DTO that validates
    `agent_log_retention_days` (`integer, between:1,3650`) and all other
    settings. Nested Spatie Data → OpenAPI schema; proper integer request body.
- [x] Frontend — `useSettings.ts`: add `agent_log_retention_days` to
    `SystemSettings` + `normalizeSettings`; add a typed `SettingsUpdatePayload`
    (integer fields mirroring `UpdateSettingsData`) for the PUT body so the
    save handler needs no `as any`.
- [x] Frontend — `agent.tsx`: add `agent_log_retention_days` to schema,
    originalData, sync, save payload + a "Data Retention" section with a
    days input (default 60). Save builds a string `formValues` for the store and
    an integer `payload` for the API — no `any` casts. Also fixed
    `system.tsx` to send `secop_limit_per_client` as an integer.
    - Note: attempted full `npm run types` regen → OpenAPI artifacts are stale
      and regen drops the hand-added `Paginator` model (breaks useServers/useUsers
      etc.), so generated files were reverted and `SettingsUpdatePayload` is kept
      local. Root cause tracked in TODO 08-hybrid-pagination ("Regenerate OpenAPI
      types").
- [x] Test: `tests/Feature/AgentDataCleanupTest.php` — cleanup deletes old
    heartbeats/batches/samples/file-activity but keeps fresh ones; **does not**
    delete agent log entries; respects custom retention days.
- [x] Docs: documented the feature on the docs site —
    `DocsUserGuideContent.tsx` "Agent Settings" (new Data Retention bullet) and
    `DocsTechnicalContent.tsx` "Scheduled commands" (agent-data:cleanup entry).
- [x] Verify: `vendor/bin/pint --dirty --format agent`; run
    `php artisan test --compact tests/Feature/AgentDataCleanupTest.php`;
    run `php artisan agent-data:cleanup` manually; `npx tsc -b` (no new errors in
    agent.tsx/useSettings.ts/docs files — remaining errors are pre-existing in
    unrelated files).

## Decisions

- Retention stored in **days** (integer) for precision and simple UI. Default
  60 (2 months).
- Clean metric batches/samples alongside heartbeats (they age together and
  would otherwise orphan after heartbeat deletion), preserving space.
- Also clean `file_activity_logs` (occurred_at) — high-volume, not meaningful
  long-term.
- **Agent logs, activities, lifecycle events, and CRUD/install/uninstall records
  are NOT cleaned** (per user decision) — only high-volume, low-retention data
  is purged. TimescaleDB hypertables (server_updates / server_network_stats)
  are governed by their own retention policies, not cleaned here.
- Reuse the existing `Setting`/settings-API path; no new table.

## Status

Implemented and verified:
- `php artisan agent-data:cleanup` runs and reports counts.
- Tests: `tests/Feature/AgentDataCleanupTest.php` green;
  `tests/Feature/SettingsAndSecOpsTest.php` → 9 passed (no regression).
- Pint clean on dirty files; `npx tsc -b` adds no new errors (pre-existing
  unrelated errors remain as noted in earlier tasks).

## Close-out verification (2026-09-08)

- `AgentDataCleanupTest`: 7 passed.
- `agent-data:cleanup` registered in `schedule:list` (daily `0 0 * * *`).
- Stale-regen note above is resolved: full `scramble:export` + `npm run types`
  chain now runs clean (tsc green, hand-kept `Paginator` type untouched by the
  generator).