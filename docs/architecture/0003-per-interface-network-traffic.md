# ADR-0003: Per-Interface Network Traffic with Checklist Filter

## Status
Accepted

## Context
The agent collected `network: [{interface, rx_bytes, tx_bytes}]` but the backend collapsed all interfaces into `server_updates.network_rbytes/tbytes` totals plotted as single Net In/Out lines. The collector was Ethernet-only (`eth*|en*` regex on Linux, `State==Enabled` on Windows) and omitted type/state, so Wi-Fi/VPN interfaces were invisible. Users need per-interface RX/TX visibility with a filter that mirrors the SecOps port/process spotlight: checklist of available interfaces, persisted per server, with the agent only sending checked interfaces.

## Decision
1. **Collector generalizes to all non-loopback interfaces** (`/proc/net/dev` + `/sys/class/net/*/type|operstate` on Linux, `Get-NetAdapter`+`Get-NetAdapterStatistics` on Windows). `NetworkMetrics` gains `type` and `state`; loopback excluded; virtual interfaces kept. `type` maps to `ethernet|wifi|vpn|unknown` (VPN via description markers), `state` is lowercase operstate/Status.

2. **New hypertable `server_network_stats`** (server_id, interface_name, interface_type, oper_state, rx_bytes, tx_bytes, created_at) mirrors `server_updates` pattern: 1-day chunks, columnstore `segmentBy [server_id, interface_name]`, 1y retention, 5 realtime CAGGs (`minute|hour|day|week|month` grouped by `timestamp, server_id, interface_name` AVG counters). `server_updates` totals remain for dashboard compat.

3. **Rates via delta:** historical per-interface MB/s = `(cur - prev)/1_000_000 / dt` between consecutive bucket midpoints (clamped 0 on reset), same as live path, so live and history agree. `ServerController::getNetworkPoints` + `computeNetworkPoints` merge by timestamp into `StatPointData.networks: [{name, netIn, netOut}]`.

4. **Live broadcast `ServerStatsUpdated` adds `n: [{name,type,state,i,o}]`** (window-function last 2 raw rows per interface within 5 min, delta/dt). Legacy `i/o` totals retained.

5. **Filter mirrors ports/processes:** `servers.network_filter` (json nullable, null=all) + `agents.available_interfaces` (agent-wide non-disconnected, `state==up`). Agent reports `available_interfaces` on startup and on change (signature `interfaceSetSignature`, `slices.Equal` like `available_processes/ports`). Heartbeat per-server partition carries `network` filtered via `runtime.FilterNetworks`; top-level `available_interfaces` drives checklist options. `AgentAuthService` includes `network_filter` in assignments, `AgentConfigUpdated` + `ServerController::updateMonitoringConfig` handle `network_filter` PATCH, `HeartbeatService::processAgent` stores available set and per-partition network.

6. **Frontend: keep two charts Net In and Net Out** (each multi-series, one line per interface, palette cycled). Shared checklist filter lives only in Net In header (Dialog same as ports/processes, options from `available_interfaces` fallback to seen networks, stored=`network_filter`). Both charts filter by same `filteredNames` (null=all). `StatPoint.networks` drives lines; `metricsBuffer` + `useServerSocket` handle `n`.

## Alternatives Considered
- Single combined Network Traffic chart with dropdown All/per-interface: rejected per user direction; two charts preserve existing layout and make RX/TX independently readable.
- Keep agent-wide network (no per-partition filter): rejected; different servers on same host need independent checklists.
- Available = all non-loopback vs non-disconnected: chose non-disconnected (`state==up`) to hide disconnected adapters from checklist, matching user spec.

## Consequences
- Historical series per interface preserved on reconnect; unchecked interfaces hidden but still stored if previously reported.
- Agent must be updated to send per-partition network and available_interfaces; old agents still work via top-level `network` fallback.
- New columns require migration `2026_08_25_add_network_filter_to_servers_and_available_interfaces_to_agents`; template variable `server.network_filter`/`available_interfaces`/`metric.networks` added.
- Tests: `NetworkTrafficTest` 4 cases + `runtime_test.go` 4-arg Upsert; `tsc -b` pre-existing errors remain unrelated, `vite build` succeeds.
