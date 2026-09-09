---
status: completed
created: 2026-08-24
started: 2026-08-24
completed: 2026-08-26
adr: docs/architecture/0002-singleton-agent-per-computer.md
---

# Single Agent per Physical Computer

## Objective

Refactor the Server Monitoring Agent so there is exactly ONE agent (one service, one binary, one
installation UUID, one OS-keystore key) per physical computer, with that single agent monitoring
multiple logical Server records. A server is attached to / detached from the existing agent; the
agent is only fully uninstalled when it owns zero servers. This supersedes the per-installation
service/on-disk/uninstall model in ADR-0001 (superseded installer portions now live in ADR-0002).

## Architecture analysis (current vs. target)

### 1. Current Agent ↔ Server relationship
- DB already encodes `Agent (1) ── * Server` via `servers.agent_id` (nullable FK, `onDelete set null`).
- `agents.server_id` is retained as a nullable legacy "primary/last server" pointer.
- Auth is already installation-level (`challenge` keyed on `installation_uuid`).
- Heartbeats are per-server (`server_uuid` required; backend validates `server.agent_id === agent.id`).
- WS: one control connection per agent, one channel per server (`private-agent.<serverUuid>`).
- **Gap:** the *installer* still creates a new agent + service + UUID per run, so physically one
  computer runs multiple agents/services even though the data model doesn't require it.

### 2. Current database relationship and constraints
- `agents.installation_uuid` — nullable, unique per the `2026_08_18` migration. ✅
- `agents.server_id` — nullable, no unique index (partial unique `agents_server_id_active_unique`
  was dropped by `2026_08_19_000001`). ✅ one agent may serve many servers.
- `servers.agent_id`, `servers.port_filter`, `servers.process_filter`, `servers.agent_deleted`. ✅
- No remaining constraint enforces "one server per agent"; the model is already N:1 (agent→servers).

### 3. Current Agent authentication
- `POST /v1/agent/auth/challenge` takes `installation_uuid` → issues a single-use challenge.
- `POST /v1/agent/auth/verify` checks the signature, then `issueSession($agent)` returns a JWT
  (`kind:agent`, 900s) + a `servers` list (each with `port_filter`/`process_filter`) + legacy
  `server_uuid`.
- ✅ Already agent-level (no per-server key). No auth contract change required.
- ⚠️ `verify` performs the no-resurrection check only on the legacy `$agent->server` (primary).
  Under multi-server it should ensure none of the agent's owned servers are resurrected. Minor
  follow-up; per-server heartbeat already re-validates ownership/lifecycle.

### 4. Current key storage
- Windows: NCrypt/CNG `MonitorAgentIdentity-<uuid>` owned by the service account (LocalSystem).
- Linux: `identity-<uuid>.pem` (0600, `monitor` user), at the data root.
- ✅ Key is computer/installation-level, never in `config.json` or DB. No change needed.

### 5. Current service installation model
- Linux: `monitor-agent@<uuid>.service` (template unit), binary in `/opt/monitor-agent/<uuid>/`.
- Windows: `MonitorAgent-<uuid>` service, binary in `Program Files\MonitorAgent\<uuid>\`.
- Each install mints a fresh UUID. ❌ Must become a single stable `monitor-agent.service` /
  `MonitorAgent` with a shared binary + shared state dir.

### 6. Current config files
- `config.json` (written by installer, self-created by agent if absent) holds `server_url`,
  `agent_version`, `installation_id`, (provision_token stripped after registration).
- `startup.log` + `agent.log` + `crash.log` + `uninstall.flag` in the instance dir.
- Under single-agent: `config.json` holds only the install-level `installation_id` + `server_url`
  (no `provision_token` since server-attach uses the provision token only at attach time). The
  per-instance `instances/<uuid>/` dirs collapse to a single shared state dir.

### 7. Current memory-only state
- Session JWT (900s), per-server `ServerRuntimeConfig` (port/process filters), WS connection.
- ✅ Already agent-level session + per-server runtime partitions (matches target). No change.

### 8. Current heartbeat protocol
- Aggregated heartbeat (`POST /v1/agent/heartbeat` with `servers[]`): ONE request per agent tick.
  Agent-wide metrics (`metrics.cpu/memory/disk/network/uptime`) are sent once at the top level;
  each server contributes one partition `{server_uuid, port_filter?, process_filter?, processes,
  open_db_ports}` carrying that server's filtered processes/ports.
- Backend `HeartbeatService::processAgent`: one Heartbeat row + one MetricBatch per tick
  (agent-level), union of partitions stored as the agent-wide Port/Process inventory (no more
  last-server-wins overwrite between filtered views), then per-server work only (ServerUpdate
  rollup, online transition, node-config eval, port-ping gate).
- Revoked servers (unknown/unowned/deleted/archived/malformed uuid) come back in
  `revoked_server_uuids`; the Go agent drops them from its runtime instead of retrying.
- Legacy per-server heartbeats (`server_uuid` payload) still accepted via `process()` for old
  agents.

### 9. Current WebSocket protocol
- One WS control connection per agent; subscribes one channel per owned server.
- ✅ Already one connection. `config.update` per server is already routed. Keep; on reconnect the
  auth response `servers` list restores all filters.

### 10. Current port/process filter handling
- `servers.port_filter`/`process_filter` (nullable JSON); null = all noise-filtered, `[]` = none,
  list = exact set. Delivered on auth + heartbeat response + WS `config.update`.
- `PingServerPorts` probes only filter-included TCP ports. ✅ Already correct, server-scoped.

### 11. Current alert ownership
- Alerts are server-level (alert scope per server). ✅ Already server-owned. No agent-level alerts.

### 12. Current uninstall behavior
- `POST /v1/agent/uninstall` (agent-authenticated): revokes the **entire** agent and marks ALL its
  servers `agent_deleted`/status=`agent_uninstalled`. ❌ No server-detach (single-server removal).
- Local scripts enumerate all instance dirs and delete them when no `-Instance` is given. ❌
  → This is the reported "deleted all agents" bug.

### 13. Current installation behavior
- `install.sh`/`install.ps1` always: fresh UUID, provision token, download binary, write per-instance
  config, create a per-installation service, register. ❌ No detection of an existing agent.

### 14. Current port pinging behavior
- `PingServerPorts` (default 60s) probes filter-inclusive TCP ports (2s timeout, records
  `ping_status`/`ping_time`). ✅ Server-scoped, unaffected.

### 15. Current offline/decommission behavior
- `HeartbeatService` + `CheckServerOffline`: offline after `offline_threshold` (default 15s, ≥
  heartbeat 5s). No-resurrection: heartbeats rejected for `agent_deleted`/archived servers. ✅
  Per-server; must remain per-server (a detached server stays `agent_uninstalled`; the agent keeps
  running for its other servers).

### 16. Migration risks
- A host with multiple legacy per-instance agents/services must be consolidated to one. This
  cannot be done safely by a single migration (live identity/key merge); it requires an explicit
  operator-run compaction step (separate runbook). Flagged as a known gap, not auto-merged.

### Target summary: what changes
- **Installer** (Linux + Windows): detect existing stable service; if present, attach new server
  to existing agent (reuse UUID + key + service); else create the single agent.
- **Single stable service** + shared binary/state dir (drop `monitor-agent@*</MonitorAgent-*`
  per-instance units).
- **Backend**: add a server-detach operation (`POST /v1/agent/server/{uuid}/uninstall` or a
  server-scoped detach) that removes one server, keeps the agent; keep full `uninstall` for the
  zero-server case.
- **Dashboard**: server-detail "Remove Server from Agent" (detach); full-agent uninstall
  surfaces only when the agent has no servers.
- **Local uninstall scripts**: target the single stable service by the (single) installation UUID
  read from the shared `config.json`; never enumerate/delete multiple installations.

### Why one agent per computer is preferable
- One identity/key/service/collector/heartbeat loop per computer = minimal footprint and no
  accidental cross-talk between logical servers on the same host.
- Alerts/filters stay server-scoped (PROD vs DEV) while collection, auth, and the WS connection
  are shared — no per-server duplication of expensive system collection.
- Eliminates the class of bug reported here (multi-wipe) entirely: there is only ever one agent.

### What remains server-specific
- `port_filter`, `process_filter`, alert configuration, per-server status/metrics state.

## Implementation Tasks

- [x] Fix uninstall bug: command built from `installation_uuid` (not provision token); scripts
      target one instance and never delete all — verified (AgentRefactorTest 12/12 pass).
- [x] Installer: detect existing single agent service; attach vs. create (install.sh + install.ps1).
- [x] Collapse to a single stable service (`monitor-agent.service` / `MonitorAgent`) + shared
      binary/state directory; Go `serviceNameFor` constant; `util.go` `instanceDir` matches the
      installer's `$DATA_ROOT/instances/$INSTALLATION_ID` (verified).
- [x] Backend: add server-detach operation (`AgentController::detachServer` + route
      `agent/servers/{uuid}/uninstall`); 404 on non-owner/revoked; fires `AgentUninstalled`,
      keeps the agent alive for its other servers.
- [x] Backend: full `AgentController::uninstall` re-implemented as an explicit operator action
      (agent-authenticated); no longer 404s on an empty agent (idle-agent clean removal works).
- [x] Frontend: replace server-detail Danger Zone "Uninstall Agent" with "Remove Server from
      Agent" (detach) — implemented in `TODO/active/04-agent-uninstall-ui.md` (now completed).
- [x] Frontend: update install/uninstall command generation to the single-agent model
      (DocsAgentInstallContent.tsx; tsc/eslint clean).
- [x] Tests: multi-server-on-one-host attach; detach-keeps-agent-alive; zero-server full-uninstall;
      revoked-agent rejection (AgentRefactorTest; `php artisan test --compact` = 110/110).
- [x] Go agent: `bootstrapDefaultConfig`/`loadConfig` path (`util.go` `instanceDir`) matches the
      shared state dir; one collector loop serves all owned servers per §8 (existing design).
- [x] Aggregated heartbeat: Go `AgentHeartbeatRequest` + per-server partitions (`sendHeartbeatStep`
      sends ONE request/tick; command acks ride the next tick), backend `processAgent`
      (metrics once, union ports/processes, per-server rollup/ping/node-config,
      `revoked_server_uuids`); legacy `server_uuid` path kept for old agents.
      AgentRefactorTest aggregated-heartbeat test (111/111) + `go test` green.

## Requirements (verification targets from ADR-0002)
Each bullet below is a verification gate for the implementation:
- One `MonitorAgent`/`monitor-agent.service` per computer; attaching a server does not create
  another service/key/UUID/heartbeat loop.
- Removing one server does not revoke the agent or delete its key.
- Removing the final server allows full agent uninstall.
- New server registers against an existing agent and is monitored by the same collectors/loop.
- One agent authentication identity; session credentials and private key remain memory/OS-keystore
  only.

## Decisions
- [ADR-0002] One agent per physical computer; single stable service + shared non-secret state dir.
- [ADR-0002] Auth stays installation-level (no protocol change); heartbeats consolidated to one
  aggregated agent-level request per tick (`servers[]` partitions), legacy per-server payloads
  still accepted for old agents.
- [ADR-0002] Uninstall splits into Server-detach (dashboard) vs. full Agent-uninstall (local script, zero-server case).

## Deferred / Skipped (known gaps)
- [ ] Consolidating multiple legacy per-instance installations into one stable service on an
  existing host — operator-run compaction (cannot be auto-merged safely). Revisit when a host with
  >1 legacy agent is detected during install.
- [ ] Empirical: build the single-agent binary + run on a host with no config.json to confirm
  shared layout produces `config.json` + `agent.log` + `startup.log`.

## Verification
- `vendor/bin/pint --dirty --format agent` clean.
- `php artisan test --compact` (AgentRefactorTest, PingServerPortsTest, HeartbeatFlowTest, new
  attach/detach tests) — all green.
- `go build ./...` + `go test ./...` in `resources/agent/go`.
- `npx tsc -b --noEmit` + `npx eslint` on touched files.
- Manual: two servers provisioned on one host attach to a single agent; removing one server leaves
  the agent online for the other; uninstall target is the stable service name.

## Active Subtask

**Item:** Installer detect-and-attach for the single-agent model (install.sh + install.ps1).

**Status:** [✓] completed (2026-08-24)

### Working State
- Installer was rewritten into a detect-and-attach single-agent model (see ADR-0002 §Decisions):
  stable `monitor-agent.service` / `MonitorAgent` service, shared binary + shared state dir,
  sha256-verified binary download, UUID parsed from the existing service (ExecStart / binary
  path). Idempotent: attach reuses the existing service/identity and merely re-provisions the
  new server; create registers the stable service pinned with `-instance <uuid>`.

### Decisions
- Detect via the stable service name (`monitor-agent` unit / `MonitorAgent` service), not files.
- The existing `config.json` `installation_id` is the reusable identity (non-secret).

### Files
- `public/install.sh`, `public/install.ps1`
- `public/uninstall.sh`, `public/uninstall.ps1` (already fixed to single-instance targeting)
- `app/Services/WindowsCommand.php`, `app/Data/ServerData.php` (already fixed)
- `docs/architecture/0002-singleton-agent-per-computer.md` (created)

### Verification
- `php artisan test --compact` green (110/110, 425 assertions, incl. AgentRefactorTest attach/detach/uninstall).
- `vendor/bin/pint --dirty --format agent` clean.
- `go build ./...` + `go test -count=1 ./...` in `resources/agent/go` pass.
- `npx eslint` on touched frontend file (`DocsAgentInstallContent.tsx`) clean.
  (`npx tsc -b --noEmit` reports pre-existing type errors in unrelated modules —
  `node-config/*`, `pages/clients/index/*`, `ThemeToggle.tsx` — not introduced by this change;
  the touched docs component is type-clean.)
- `bash -n` on `public/install.sh` + `public/uninstall.sh` OK; AST parse on
  `public/install.ps1` + `public/uninstall.ps1` (PowerShell 5.1 parser) OK.

### Known Issues
- Consolidation of pre-existing multi-agent hosts is out of scope for this step (deferred).
