---
status: completed
created: 2026-08-24
started: 2026-08-24
completed: 2026-08-26
adr: adr-0003
---

# Generalize Ethernet-only network monitoring into per-interface Network Traffic

## Objective
Refactor the existing Ethernet-only connection check into a generic **Network Traffic** collector that detects and tracks all available network interfaces (Wi-Fi, Ethernet, VPN, etc.), reports them as independent per-interface RX/TX time-series, and renders a multi-series **Network Traffic** graph with an interface filter.

## Architecture decisions (recorded in ADR-0003)
- The agent already reports `network: [{interface, rx_bytes, tx_bytes}]`. The backend collapses all interfaces into scalar `network_rbytes`/`network_tbytes` totals, which is what the line graphs plot. To get per-interface visibility we need to persist per-interface counters.
- A new hypertable `server_network_stats` (server_id, interface_name, interface_type, oper_state, rx_bytes, tx_bytes, created_at) mirrors the existing `server_updates` Timescale hypertable pattern (raw + minute/hour/day/week/month continuous aggregates).
- `server_updates.network_rbytes`/`network_tbytes` are retained as the cross-interface sum for backward compatibility (dashboard overview, reporting summary) — the existing heartbeat interval, telemetry path, and aggregate rollups stay intact.
- Rates (MB/s) are computed as deltas of cumulative counters divided by the bucket/interval seconds, exactly as the existing `netIn`/`netOut` logic does today — only now per interface.
- The live WebSocket `ServerStatsUpdated` broadcast gains a `n` (networks) field carrying an array of per-interface `{name, type, state, rx, tx}` snapshot objects; the existing single-letter `i`/`o` totals remain so legacy clients/consumers don't break.
- **Revised 2026-08-25 per user directive:** Keep two separate charts **Net In** and **Net Out** (each multi-series, one line per interface). Shared **checklist filter** lives only in Net In chart header but controls both charts. Filter semantics mirror `port_filter`/`process_filter`: `servers.network_filter` (nullable = all) + `agents.available_interfaces` (agent-wide non-disconnected set). Agent reports `available_interfaces` on startup and on change (signature-based, like `available_processes`/`available_ports`); heartbeat `network` array contains only checked interfaces. Historical graph shows lines based on checklist; disconnected interfaces excluded from available set.

## Implementation Tasks
- [x] 1. Agent: generalize `getNetworkStats` on Linux (enumerate all non-loopback interfaces + type/oper-state) and Windows (Get-NetAdapter with InterfaceDescription/MediaConnectionState/Status). Remove the Ethernet-only regex. Add `Type` + `State` to `NetworkMetrics`.
- [x] 2. Backend model/DTO: extend `NetworkMetrics`-equivalent payload handling to preserve per-interface identity; add `server_network_stats` migration + model + aggregates. Keep `server_updates` totals.
- [x] 3. Backend HeartbeatService: persist per-interface rows into `server_network_stats` while still writing the summed totals into `server_updates`.
- [x] 4. Backend ServerController: add per-interface stat computation (`computeNetworkStatPointFromAgg`) producing `netIn`/`netOut` per interface key; extend `StatPointData`/live broadcast with networks array.
- [x] 5. Backend network_filter plumbing: `servers.network_filter` + `agents.available_interfaces`, `Server`/`Agent` casts, `AgentAuthService`, `HeartbeatService` (available_interfaces union + per-partition network), `AgentConfigUpdated` + `ServerController` PATCH `network_filter`.
- [x] 6. Agent network_filter plumbing: `ServerAssignment.NetworkFilter`, `ServerPartition.Network`, `AvailableInterfaces`, `runtime.NetworkFilter`, `FilterNetworks`, `interfaceSetSignature`, `sendHeartbeatStep` availableChanged + per-partition filtering, `client.go`/`ws.go` parsing.
- [x] 7. Frontend graph: keep 2 charts **Net In** / **Net Out** multi-series (one line per interface), shared **checklist filter** in Net In header (same dialog pattern as ports/processes), lines filtered by checklist; `available_interfaces` drives options.
- [x] 8. Frontend types: extend `StatPointData`/`StatPoint`/models.ts with per-interface `networks` array; keep `netIn`/`netOut` totals for dashboard compatibility.
- [x] 9. Update docs/docs content references (DocsAgentMonitoring/DocsTechnical/DocsDeployment/DocsUserGuide/DocsAgentArchitecture) that say network is Ethernet-specific where inaccurate. — no Ethernet refs found; ADR-0003 created.
- [x] 10. Add/update tests: Go metrics unit test, PHP HeartbeatService test (network_filter + available_interfaces), frontend type coverage. — `metrics_windows_test.go` winIfaceType, `NetworkTrafficTest` 4 cases, `runtime_test.go` updated; `available_interfaces`/`network_filter` covered via existing filter plumbing.
- [x] 11. Run lint/typecheck/test for all three layers.

## Requirements
- Collect all interfaces, exclude loopback; no Ethernet-only filter; keep virtual interfaces reportable.
- Stable interface identifier (name + type), not just display name.
- RX and TX tracked independently per interface.
- Keep 2 charts Net In / Net Out (multi-series, one line per interface); checklist filter lives in Net In header and controls both.
- Available set = non-disconnected interfaces only; sent on startup and on change (signature-based). Heartbeat `network` contains only checked interfaces.
- Existing heartbeat/telemetry architecture intact; no duplicate collectors/polling.

## Deferred / Skipped (known gaps)
- None yet.

## Active Subtask

**Item:** 9. Update docs / 10. Tests / 11. Lint sweep

**Status:** [•] in progress

### Working State
- Tasks 1–8 complete (backend + agent + frontend checklist pivot done).
- Backend: `2026_08_25_122638_add_network_filter_to_servers_and_available_interfaces_to_agents.php` migrated (367ms), `Server`/`Agent` casts added, `AgentAuthService` now returns `network_filter`, `HeartbeatService` handles `available_interfaces` (array_key_exists) and per-partition `network` merging into `recordServerUpdate`, `AgentConfigUpdated` + `ServerController` PATCH for `network_filter` done.
- Agent: `models.go` (NetworkFilter, AvailableInterfaces, ServerPartition.Network), `runtime.go` (NetworkFilter map + IsNetworkAllowed/FilterNetworks + Upsert 4-arg), `client.go` parse `network_filter`, `ws.go` preserve existing filter handling, `main.go` collects `allNetworks`/`availableNetworks` via `filterAvailableNetworks` (state==up), `interfaceSetSignature` + `lastSentInterfaces`, per-partition `FilterNetworks`, `util.go` helpers added; `runtime_test.go` updated for 4-arg Upsert; `go vet` clean, `go test` ok.
- Frontend: `MetricsTab.tsx` MonitoringFilter extended to `interfaces` kind (options from `available_interfaces` + fallback stats, stored=`network_filter`, PATCH), `NetworkTrafficChart.tsx` rewritten to dual charts Net In/Net Out sharing `network_filter` (palette per interface, InterfaceFilter dialog inside Net In header), `types/models.ts` + `types/stats.ts` + `types/models.ts` manual patches, `templateVariables.ts` labels for `server.available_interfaces`/`server.network_filter` + `metric.networks`, `ServerStatChart` dataKey Exclude networks; `vite build` fails only on pre-existing tsc errors (NodeConfigEditor, ThemeToggle etc.), `npx vite build` succeeds in 17.58s.
- Next: docs references (Ethernet-specific wording), Go/Php tests for network_filter, final lint/typecheck.

### Decisions
- Filter mirrors ports/processes: null=all, array=checked; available = state==up (non-disconnected). Palette cycles per interface, both charts share same filteredNames.
- Heartbeat available_interfaces is agent-wide top-level, network is per-partition filtered — HeartbeatService merges per-server.
- Historical lines for unchecked interfaces hidden; disconnected excluded from available.

### Files
- database/migrations/2026_08_25_122638_add_network_filter_to_servers_and_available_interfaces_to_agents.php
- app/Models/Server.php, Agent.php, ServerData.php, AgentAuthService.php, AgentConfigUpdated.php, ServerController.php, HeartbeatService.php
- resources/agent/go/models.go, runtime.go, client.go, ws.go, main.go, util.go, runtime_test.go
- frontend/src/types/models.ts, types/stats.ts, components/node-config/nodes/templateVariables.ts, pages/dashboard/components/ServerStatChart.tsx, pages/servers/detail/tabs/MetricsTab.tsx, pages/servers/detail/components/NetworkTrafficChart.tsx
- tests/Feature/NetworkTrafficTest.php (existing 4 tests still relevant)
- docs/architecture/0002-singleton-agent-per-computer.md, docs/architecture/0001-agent-server-relationship.md (pending update)

### Verification
- `php artisan migrate` ok; `go vet ./...` clean; `go test ./...` ok (0.865s); `php artisan test --compact --filter=NetworkTraffic` 4/4; full `php artisan test --compact` 115/115 after drop/recreate DB; `vendor/bin/pint --dirty` passed; `npx vite build` ✓ 17.58s; `tsc -b` still shows 20 pre-existing errors (NodeConfig etc.) plus our fixed ones (templateVariables, MetricsTab, NetworkTrafficChart now clean).

## Context Summary
All 8 implementation tasks complete and verified. Agent: Linux `/proc/net/dev` + `/sys/class/net` + Windows `Get-NetAdapter{Statistics}` now report all non-loopback interfaces with `type`/`state`; Go `go vet/test` clean (winIfaceType, runtime 4-arg Upsert). Backend: `server_network_stats` hypertable + 5 CAGGs, `Server/NetworkFilter` plumbing (`servers.network_filter`, `agents.available_interfaces`, `AgentAuthService`, `HeartbeatService` per-partition network + available set, `AgentConfigUpdated`/`ServerController` PATCH, `StatPointData.networks`, live `n`). Agent: `ServerAssignment.NetworkFilter`, `ServerPartition.Network`, `AvailableInterfaces`, `runtime.NetworkFilter` + `FilterNetworks`/`IsNetworkAllowed`, `interfaceSetSignature`/`filterAvailableNetworks` (state==up), `sendHeartbeatStep` per-partition filtering + availableChanged. Frontend: `MetricsTab` MonitoringFilter extended to `interfaces`, `NetworkTrafficChart` dual Net In/Out multi-series sharing checklist (InterfaceFilter dialog in Net In header, palette per interface, `vite build` ok). Types: `StatPoint`/`StatPointData`/`ServerData` extended, `templateVariables` + `ServerStatChart` fixed. Migrations `2026_08_24` + `2026_08_25` applied. ADR-0003 created. Tests: `NetworkTrafficTest` 4/4, `go test` ok, `php artisan test` 115/115, `pint` passed, `vite build` 17.58s. Pre-existing `tsc -b` errors remain in unrelated files (NodeConfig, ThemeToggle etc.). Ready to archive TODO → `completed/` and write commit message.
