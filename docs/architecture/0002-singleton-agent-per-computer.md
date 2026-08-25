# ADR-0002: Single Agent per Physical Computer

## Status

Accepted

> Implementation of the installer detect-and-attach, single-stable-service, backend
> server-detach, and zero-server-only full-uninstall model (Linux + Windows) is complete
> and verified — see `TODO/active/05-single-agent-per-computer.md`. The installer/on-disk
> portions of ADR-0001 are superseded by this ADR (flagged in ADR-0001 §Status).

## Context

ADR-0001 established that one agent installation can own many servers (`servers.agent_id`,
nullable `agents.server_id`, per-server `port_filter`/`process_filter`, agent-level auth by
`installation_uuid`, heartbeats with ownership validation — now consolidated to one aggregated
request per tick, §Decision 7). The database, model, and
authentication layers already encode the target relationship:

```
Agent (1) ──────── * Server
```

However, the **installer + service + on-disk model** in ADR-0001 still assumes a *per-installation
physical footprint*:

- `install.sh` / `install.ps1` mint a **fresh `INSTALLATION_ID` (UUID) on every run**, register a
  new agent, create a **new service** per installation (`monitor-agent@{$UUID}.service` on Linux,
  `MonitorAgent-{$UUID}` on Windows), and write **per-instance directories**
  (`instances/<uuid>/`, `/opt/monitor-agent/<uuid>/`, `Program Files\MonitorAgent\<uuid>\`).
- `uninstall.ps1` / `uninstall.sh` enumerate **every** instance directory and, when no `-Instance`
  is given, delete **all** of them — which is how an operator accidentally wiped every agent on a
  host instead of one.
- Uninstall is **agent-level only**: `AgentController::uninstall` revokes the entire agent and
  marks all its servers `agent_uninstalled` at once, so there is no way to remove a *single
  server* while keeping the agent.

This physically contradicts the one-agent-per-computer model the product now requires: a computer
should run exactly one `MonitorAgent` process/service/identity, and a server is attached to or
detached from that single agent.

## Decision

Refactor the physical/installer/lifecycle layer to match the data model already in place:

1. **One computer = one agent.** There is exactly one `MonitorAgent` installation per physical
   host: one service, one binary location, one installation UUID, and exactly one OS-keystore
   key pair. A server is a logical monitored environment on that computer.

2. **Installer is computer-aware (detect, don't duplicate).** When the install script runs:
   - It detects an existing `MonitorAgent` via the **service** identity (`MonitorAgent` on Windows,
     `monitor-agent.service` on Linux) — not by hostname, process name, or config contents.
   - If none exists: create the single service, generate/persist the installation UUID and the
     private key in the OS keystore, bootstrap `config.json` with the backend URL, register the
     agent, and attach the newly provisioned server.
   - If an agent already exists: do **not** install another service, do **not** create another
     key or UUID, do **not** restart the running agent's collectors. Instead attach the newly
     provisioned server to the existing agent. The running agent picks up the new server on its
     next auth/heartbeat cycle (config delivered via the WebSocket `config.update` event / auth
     response `servers` list).

3. **Shared, non-secret on-disk layout.** The installation directory is shared by the single
   agent (not per-server):
   - Windows: binary `C:\Program Files\MonitorAgent\MonitorAgent.exe`; state
     `C:\ProgramData\MonitorAgent\` (`config.json`, `agent.log`, `startup.log`).
   - Linux: binary `/opt/monitor-agent/monitor-agent`; state `/var/lib/monitor-agent/`
     (`config.json`, `agent.log`, `startup.log`).
   - `config.json` holds only non-secret bootstrap data: `server_url`, `agent_version`,
     `installation_id`. The private key is **never** on disk — only in the Windows NCrypt/CNG
     store (`MonitorAgentIdentity`) or, on Linux, the OS-keystore file (`/var/lib/monitor-agent/identity-<uuid>.pem`,
     mode `0600`, owned by the `monitor` user) protected by a non-exportable key when the platform
     allows it.

4. **Two uninstall concepts.**
   - **Detach Server** (from the server-detail Agent tab): the agent authenticates and requests
     removal of *one server*. The backend sets that server's `agent_id = null`,
     `agent_deleted = true`, `status = agent_uninstalled`, and fires `AgentUninstalled`. The agent
     and its identity **persist**; remaining servers keep monitoring. If this leaves the agent with
     zero servers, the agent becomes eligible for full removal.
   - **Uninstall Agent** (only meaningful when an agent has zero servers, or when decommissioning
     the whole computer): revokes the agent identity (`status=revoked`, `revoked_at`), removes all
     remaining server associations, stops/removes the single service, and retires the OS-keystore
     key. The local uninstall script targets the single stable service.

5. **One WebSocket control connection per agent** (already one connection; it already subscribes
   to one channel per server). `config.update` events are routed to the affected `ServerRuntime`
   partition in memory. On reconnect the agent refreshes its session and receives the full
   current `servers` list (all filters) from the auth response.

6. **Installer detection uses the service**, not files: the installer probes for the stable
   service name; if present, it reads the existing `installation_id` from `config.json` and
   attaches the new server via `/api/v1/register` (provision-token-scoped) instead of minting a
   new agent.

7. **One aggregated heartbeat per agent tick.** The agent sends ONE `POST /api/v1/agent/heartbeat`
   per tick carrying agent-wide metrics once (`metrics.cpu/memory/disk/network/uptime`) plus one
   `{server_uuid, port_filter?, process_filter?, processes, open_db_ports}` partition per server.
   The backend (`HeartbeatService::processAgent`) writes one Heartbeat + one MetricBatch per tick,
   stores the union of partitions as the agent-wide port/process inventory (a server whose filter
   excludes a port can no longer close a port another server monitors — `pingablePorts` re-applies
   each server's DB filter at read time), and runs only genuinely per-server work (ServerUpdate
   rollup, online transition, node-config eval, ping gate) in a loop. Servers that are unknown,
   unowned, deleted/archived, or malformed come back in `revoked_server_uuids`; the agent drops
   them from its runtime. Legacy per-server heartbeats (`server_uuid` payload) remain accepted via
   `process()` for old agents. Command acks ride the next aggregated tick instead of a separate
   per-server ack request.

## Alternatives Considered

- **Keep per-installation services and accept multi-delete as a UX bug.** Rejected: it directly
  contradicts "the agent is synonymous with the computer" and re-introduces the accidental
  multi-wipe and per-server identity/key multiplication.
- **Per-server uninstall script scoped by server UUID.** Rejected: there are not multiple agents
  on the host anymore, so a server UUID is not an installation identity. Server removal belongs to
  the dashboard (detach), agent removal to the local script (full uninstall).
- **Delete the identity key on every server detach.** Rejected: the key is agent/computer-level,
  not server-level; deleting it would break every other server on the agent.

## Consequences

- **Breaking for co-installed instances:** a host previously running multiple per-server agent
  installations (each with its own service + key) must be consolidated. A separate, explicitly-run
  migration/compaction is documented in its own migration concern (see TODO-05, "Migration
  concerns"). A single migration cannot safely merge live identities, so this is flagged as an
  explicit migration risk rather than auto-merged.
- **Uninstall UX changes:** the server-detail Danger Zone action "Uninstall Agent" becomes
  "Remove Server from Agent" (detach); a separate full-agent uninstall surfaces only when the
  agent has zero servers.
- **Service name stability:** Windows `MonitorAgent-*` and Linux `monitor-agent@*` per-instance
  units are replaced by stable `MonitorAgent` / `monitor-agent.service`. Existing per-instance
  services must be removed manually during consolidation (documented).
- **Backward compatibility:** the `installation_uuid` remains the canonical agent identity and is
  the public, non-secret identifier used in naming and API requests (unchanged). Auth
  (challenge/verify) is already installation-level, so no auth contract change is required.

## Supersedes / Relation to ADR-0001

ADR-0001's data-model, authentication, heartbeat, filter, and log-root-cause decisions remain
valid and are **not** superseded. Only the **installer / service / on-disk / uninstall** portions of
ADR-0001 §On-Disk Layout and §Consequences (per-instance service units, `instances/<uuid>`
directories, "each installation gets a fresh UUID and a new service") are superseded by this ADR.
