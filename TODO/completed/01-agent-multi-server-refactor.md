---
status: completed
created: 2026-08-19
started: 2026-08-19
completed: 2026-08-26
adr: docs/architecture/0001-agent-server-relationship.md
---

# Agent Multi-Server Refactor + Port/Process Filter + Agent Log/Config Root Cause Fix

## Objective

Refactor the Server Monitoring Agent so one agent installation (installation UUID + OS-keystore RSA key) can own and monitor multiple servers, each with its own server-specific monitoring configuration held in the agent's runtime memory (backend stays source of truth). Add a per-server port/process **filter** — the SecOps spotlight: by default all non-local, non-system, and app ports/processes are sent; the server-details UI shows a filter list of every port/process seen in history (even currently closed), all checked by default, and saving the checked set persists the filter that the agent loads into memory at startup. The agent only ever sends the checked ports/processes, and the backend ping job only probes the checked ports. Fix the actual root cause of `agent.log` / `config.json` not being produced, then verify everything: existing functionality, auth security, key storage, tests.

## Implementation Tasks

- [x] Backend: migration + models (server belongs to agent; agent owns many servers; `servers.port_filter` + `servers.process_filter`; backfill)
- [x] Backend: ProvisioningService registration (find-or-create by installation_uuid; attach server; no 409 for different server; no revoke unless agent loses all servers)
- [x] Backend: AgentAuthService issueSession returns per-server payload (servers list incl. filters, legacy server_uuid kept)
- [x] Backend: HeartbeatService per-server processing + lifecycle/ownership validation (no resurrection) + filter delivery; processes persist as history; drop backend noise re-filter
- [x] Backend: AgentBroadcastAuthController multi-server channel auth
- [x] Backend: AgentController uninstall/agent_error + AgentVersionSync + NodeTaskScheduler reverse-lookup
- [x] Backend: ServerController updateMonitoringConfig endpoint; remove destroyPort route + endpoint
- [x] Backend: PingServerPorts + HeartbeatService dispatch gate respect `servers.port_filter` (null = all TCP, list = only those, empty = none)
- [x] Go: runtime server config map (serverUUID → port/process filters), per-server heartbeats, filter of open_db_ports + top_processes
- [x] Go: multi-channel WS subscription + config.update per server
- [x] Go: self-bootstrap default config.json on first run; robust logging (root-cause fix)
- [x] Frontend: server-details port/process filter modal (all-history checkbox list, default all checked, Save disabled when unchanged, descriptive items, saves filter); remove delete-port UI
- [x] Tests: update AgentRefactorTest/HeartbeatFlowTest, add multi-server + filter + ping tests; Go runtime unit tests
- [x] Verify: pint, php artisan test, go build + go test; rebuild agent binaries; npm run types (regenerate API schema)
- [x] Terminology: "whitelist" → "filter" everywhere (done backend + Go + frontend + docs + regenerated schema)

## Progress Notes (2026-08-19)

- Backend, Go agent, frontend filter modal, ping enforcement, tests, and binary rebuild are complete. `vendor/bin/pint`, `go build ./...`, `go test ./...`, AgentRefactorTest (10) + PingServerPortsTest (4) pass. `php artisan scramble:export` + `npm run types` regenerated the frontend schema/models with the `monitoring` PATCH endpoint; no type errors in the touched frontend files. `scripts/build-agent.ps1` rebuilt both binaries and bumped AgentVersion → 2.2.
- UX fix: the install flow no longer hard-reloads the page on `RegistrationCompleted`. `useServerSocket` now invalidates `["server", uuid]` + `["servers"]` instead of `window.location.reload()`, so the pending-installation → waiting_for_first_heartbeat → online transition is smooth and in place (ServerStatusUpdated already invalidated the same keys).
- Terminology normalized from "whitelist" to "filter": DB columns renamed via a new migration (`port_whitelist` → `port_filter`, `process_whitelist` → `process_filter`), Go JSON keys `port_filter`/`process_filter`, API + frontend types regenerated.
- The full `php artisan test` suite is polluted by a pre-existing test-ordering/seeding issue (SettingsAndSecOpsTest, UserClientsTest, AuthTest, UploadIntentTest fail on HEAD too, verified via stash). Not caused by this refactor.
- Regenerated `database/schema/pgsql-schema.sql` (it had been deleted, which broke tests that ran migrations + the settings seeder). Migrations are Postgres-safe (`DROP INDEX` + `UPDATE ... FROM` for pgsql, MySQL branch kept for the other driver; rename migration uses `renameColumn`).
- Remaining: rebuild `public/MonitorAgent.exe` + `public/agent` via `scripts/build-agent.ps1` (DONE, AgentVersion 2.2).

## Requirements

### Agent identity & auth (unchanged guarantees)
- Agent identity = installation UUID + RSA public/private key pair in the OS keystore (Windows CNG/NCrypt as `MonitorAgentIdentity-<uuid>` for the service account; Linux 0600 file `/var/lib/monitor-agent/identity-<uuid>.pem`). Never in config.json, agent dir, DB, or logs.
- Registration uses a provision token; subsequent auth is challenge/response; session JWT kept in memory only.
- Auth is installation-level and must work identically whether the agent serves 1 or N servers.

### One agent, many servers
- Canonical ownership: `servers.agent_id` FK (nullable, onDelete set null). Agent owns many servers.
- `agents.server_id` kept nullable as a legacy "primary/last" pointer for backward compatibility (existing code reads `$agent->server`).
- Registration becomes find-or-create by `installation_uuid`. Same UUID registering a second server attaches it to the same agent (no 409). A server may switch agents; the old agent is revoked only when it ends up serving zero servers.
- Drop the partial unique index `agents_server_id_active_unique`; keep `installation_uuid` unique.

### Per-server configuration in agent runtime memory
- Backend is source of truth: `servers.port_filter` + `servers.process_filter` JSON columns. `null` = monitor everything that passes the agent's built-in noise filter (loopback, system ports/processes, ephemeral ≥49152). A non-null list = only those ports/processes matter (SecOps spotlight). Delivered per server on auth (servers list) and refreshed per server on heartbeat responses.
- Agent keeps in-memory `map[serverUUID]ServerRuntimeConfig{PortFilter, ProcessFilter}`. `open_db_ports` is filtered by the filter of the server each heartbeat targets; `top_processes` likewise by name. Isolation: changing server A's filter must not affect server B's.
- Machine metrics (CPU/RAM/disk/network/uptime) are collected once and reused for each server's heartbeat — never duplicated per server.
- Backend no longer re-filters port noise (so a filtered-in item is never silently dropped); ports table keeps closed rows as history; processes are no longer deleted per heartbeat (history for the filter list).
- Backend ping job (`PingServerPorts`) and its dispatch gate share `PingServerPorts::pingablePorts($server, $agent)`: null filter probes every TCP port the agent reports; a list probes exactly those; empty probes nothing.

### SecOps filter (frontend)
- Remove the port delete (Trash) UI and the `destroyPort` API; it is replaced by a filter.
- In server details → ports list (and processes list), a filter control (modal) lists every port/process in history (rows kept even when closed), all checkboxes checked by default; the user can uncheck to spotlight only the important items. Rows are descriptive (port + protocol/process; process + pid). Saving stores the checked set in `servers.port_filter` / `servers.process_filter` (null when everything is checked); Save is disabled when the selection equals what is already saved. Persisted to DB, fetched by the agent at startup into memory.

### Heartbeats per server, no resurrection
- One heartbeat per server, each carrying `server_uuid`. Backend must resolve the server by uuid and validate ownership (`server.agent_id === agent.id`) and lifecycle before processing. Archived / `agent_deleted` servers → 403/410, never resurrected.

### File / log root cause fix
- Root cause (empirically verified + git history): the agent never creates `config.json` — it is only written by the external installer (`public/install.ps1`, `public/install.sh`). When missing, `loadConfig()` is fatal and the agent exits silently (exit 0) after writing only `startup.log` + a one-line instance `agent.log`. The old binary (git 4e1e9c2) read `bootstrap.json` next to the executable / CWD (Program Files/System32 — unwritable), which matches the "missing in the installation folder" field report.
- Fix: agent self-creates a minimal default `config.json` (installation_id, agent_version — no secrets, no server_url) in the canonical instance dir when absent, and logs clearly; logging must be robust even when the instance dir is newly created. Canonical locations: Windows `C:\ProgramData\MonitorAgent\instances\<uuid>\`; Linux `/var/lib/monitor-agent/instances/<uuid>\`.
- Full on-disk layout + per-file contents (`config.json`, `agent.log`, `crash.log`, `uninstall.flag`, `startup.log`) and the Program Files vs ProgramData split are documented in ADR-0001 "On-Disk Layout & File Contents". Users diagnose the agent in the ProgramData/var-lib instance dir, NOT the Program Files folder.

### Backward compatibility
- Existing single-server agents keep working. `server_uuid` stays in auth + heartbeat responses (legacy field = first/primary owned server). Heartbeat response `configuration` / `pending_commands` / `pending_update` structure unchanged. Frontend `server.agent` unchanged.

## Decisions

- [ADR-0001] Servers belong to agents (`servers.agent_id`); agents may serve many servers; `agents.server_id` retained as nullable legacy pointer.
- [ADR-0001] Per-server port/process **filters** stored on the server (JSON) and mirrored into agent runtime memory; the filter applies to `open_db_ports` + `top_processes`; null = all noise-filtered items. Replaces the earlier blacklist idea.
- [ADR-0001] Agent self-creates a default `config.json` on first run (installation_id + agent_version only, no credentials); canonical state dirs are ProgramData/var-lib, never the executable directory.
- Terminology: "whitelist" → "filter" (per user). DB columns renamed by a new migration; JSON/API keys, Go struct fields, and docs updated; no data loss (rename only).
- No DB change to `heartbeats` table needed — per-server association is via the server's own status/updates; heartbeats remain agent-level (machine metrics are agent-level).
- Rejected: dropping `agents.server_id` — too much churn; kept as legacy pointer, unused by new code.
- Rejected: storing server config in a separate per-server config file on disk — runtime memory per the requirement; backend is source of truth.

## Deferred / Skipped (known gaps)

- [x] Frontend (AgentTab/agent settings UI) not modified — no UI change requested.
- [x] `install.ps1`/`install.sh` unchanged (they already write config.json + chown correctly); the agent self-bootstrap is the safety net.
- [ ] Config update over WS per server (binary_update stays agent-level) — config_update already carries one server's heartbeat_interval; multi-server config_update fan-out not needed yet.
- [x] Rebuild `public/MonitorAgent.exe` + `public/agent` binaries at the end (build command `scripts/build-agent.ps1`) — DONE, AgentVersion bumped to 2.2; required for the fix to reach production installers.
- [ ] Empirical: run the built agent on a host with no config.json → confirm config.json + agent.log + startup.log are produced in the canonical instance dir (manual step, needs a real host). Also confirm on the real host that `C:\ProgramData\MonitorAgent\instances\<uuid>\` holds config.json + agent.log (user initially looked in Program Files).

## Verification

- `vendor/bin/pint --dirty --format agent`
- `php artisan test --compact` (AgentRefactorTest, PingServerPortsTest, HeartbeatFlowTest, new tests)
- `go build ./...` + `go test ./...` inside `resources/agent/go`
- Empirical: run built agent with no config.json → verify config.json + agent.log + startup.log are produced in canonical locations
- Rebuild Windows + Linux agent binaries via `scripts/build-agent.ps1`

## Context Summary

**Status:** Implementation complete; remaining verification item is the manual empirical no-config.json run on a real host (and confirming ProgramData holds config.json + agent.log).

**What was implemented this session:**
- Backend: migration adds `servers.agent_id`, `port_filter`, `process_filter` (Postgres-safe `DROP INDEX`/`UPDATE ... FROM`) + rename migration `port_whitelist`/`process_whitelist` → `port_filter`/`process_filter`; models (`Agent::servers/monitoredServers`, `Server::agent` belongsTo); ProvisioningService find-or-create + revoke-only-if-zero-servers; AgentAuthService per-server session payload; HeartbeatService per-server signature; AgentController heartbeat ownership/lifecycle validation (403s), multi-server uninstall + agent_error; broadcast channel auth per server; AgentVersionSync/NodeTaskScheduler reverse lookups; ServerController `updateMonitoringConfig` (null = reset) replacing `destroyPort`; `PATCH /clients/{clientUuid}/servers/{serverUuid}/monitoring` route; `PingServerPorts::pingablePorts` + dispatch gate whitelist→filter-aware.
- Go agent: `runtime.go` AgentRuntime filter store (`PortFilter`/`ProcessFilter`), `models.go`/`client.go` multi-server session parsing with `port_filter`/`process_filter` JSON keys, `main.go` per-server heartbeat loop with filter + 403/404/410 server eviction, `ws.go` one channel per server, `util.go` `bootstrapDefaultConfig` (self-creates config.json — the root-cause fix).
- Frontend: removed delete-port UI + `handleDeletePort`; added `MonitoringFilter` modal in MetricsTab (all-history descriptive port/process rows, default all, Save disabled when unchanged, PATCHes filter, null on reset).
- Tests: AgentRefactorTest rewritten for multi-server semantics + filter endpoint + ownership 403; `PingServerPortsTest` (4); `runtime_test.go` for filter isolation; regenerated `database/schema/pgsql-schema.sql` and frontend API schema.

**Verification:** `vendor/bin/pint` clean; AgentRefactorTest (10) + PingServerPortsTest (4) pass; `go build ./...` + `go test ./...` pass; frontend files typecheck (pre-existing repo-wide TS errors unrelated). Full `php artisan test` suite is polluted by a pre-existing test-ordering/seeding issue (fails on HEAD too).

**Next:** only the manual empirical run remains (run the built agent on a host with no config.json → confirm config.json + agent.log + startup.log are produced). After that, the task can be moved to `TODO/completed/`.