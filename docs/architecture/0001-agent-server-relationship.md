# ADR-0001: Agent-Server Ownership Model and Agent Self-Bootstrap

## Status

Partially Superseded by [ADR-0002: Single Agent per Physical Computer](./0002-singleton-agent-per-computer.md)

> **Note (superseded installer/on-disk/uninstall model):** the data-model, authentication,
> heartbeat, filter, and log-root-cause decisions in this ADR remain in force. The *installer /
> per-instance service / `instances/<uuid>` on-disk layout / multi-delete uninstall* portions of
> this ADR's On-Disk Layout and Consequences are superseded by [ADR-0002: Single Agent per
> Physical Computer](./0002-singleton-agent-per-computer.md), which makes the agent synonymous
> with the physical computer (one shared service, shared non-secret state dir, detect-and-attach
> installer, and split server-detach vs. full-agent uninstall).

## Context

The monitoring agent was designed as one installation per server: `agents.server_id` was a required FK and a partial unique index (`agents_server_id_active_unique`) enforced one active agent per server. Registration rejected the same installation UUID on a different server (409) and revoked the previous agent when a new installation took over a server. Auth, heartbeat, WS channel authorization, uninstall, version sync, and the reverse lookup all relied on `$agent->server` (a single server).

The product now requires one agent installation to monitor multiple servers, each with server-specific monitoring configuration (port blacklists) that must be isolated and enforced by the agent while the backend remains the source of truth.

Separately, field reports showed `agent.log` and `config.json` missing. Investigation (empirical run + git history) proved the agent never creates `config.json` — only the external installers do — and a missing `config.json` makes `loadConfig()` fatal, so the agent exits silently. The legacy binary read `bootstrap.json` relative to the executable/CWD (unwritable Program Files/System32), matching the "missing in installation folder" report.

## Decision

1. **Servers belong to agents.** Add nullable `servers.agent_id` FK (`onDelete set null`) as the canonical ownership. `agents.server_id` becomes nullable and is retained only as a legacy "primary/last server" pointer so existing code and backfilled rows keep working. Drop the partial unique index; `installation_uuid` remains unique. One agent may own N active servers; a server is owned by exactly one agent.

2. **Registration is find-or-create by installation_uuid.** The same UUID registering additional servers attaches them to the same agent. A server may switch agents; the displaced agent is revoked only when it owns zero servers afterward. No more 409 for UUID-vs-server mismatch.

3. **Per-server configuration lives in backend + agent runtime memory.** `servers.port_filter` and `servers.process_filter` (JSON, nullable) are the source of truth. `null` = monitor everything the agent's built-in noise filter (loopback, system ports/processes, ephemeral ≥49152) allows; a non-null list is the exact set of ports/processes that matter to that server. Delivered on auth (in the `servers` list) and refreshed per server on each heartbeat response. The agent keeps an in-memory `map[serverUUID] → ServerRuntimeConfig{PortFilter, ProcessFilter}` and only reports filtered-in ports/processes. Machine metrics are collected once and reused for every server's heartbeat. The filter is the SecOps spotlight: the UI filter lists every port/process ever seen (closed rows are kept as history), defaults to all checked, and saving un-checked items persists the curated set.

4. **Heartbeats are per-server.** Each heartbeat carries `server_uuid`; the backend validates ownership (`server.agent_id === agent.id`) and lifecycle (archived/`agent_deleted` ⇒ reject, never resurrect). Auth/WS remain installation-level; the agent subscribes to one control channel per server.

5. **Agent self-bootstrap.** When `config.json` is absent on first run, the agent creates a minimal default (installation_id + agent_version only — no secrets, no server_url) in the canonical instance dir and logs clearly instead of exiting silently. Canonical locations: Windows `C:\ProgramData\MonitorAgent\instances\<uuid>\`, Linux `/var/lib/monitor-agent/instances/<uuid>\`. Logging is robust even when the instance dir is newly created.

## On-Disk Layout & File Contents

Windows convention separates immutable binaries from mutable machine state; the agent follows it:

- **Binary (read-only):** `C:\Program Files\MonitorAgent\<uuid>\MonitorAgent.exe` (Linux: `/usr/local/bin` or `/opt`). The agent never writes here — Program Files unwritability was the original root cause of the missing files.
- **State (service-writable):** `C:\ProgramData\MonitorAgent\instances\<uuid>\` (Linux: `/var/lib/monitor-agent/instances/<uuid>/`). ProgramData is the correct home for machine-wide, service-writable app data (config + logs); AppData is per-user and wrong for a LocalSystem agent.

Per-installation files:

| File | Owner | Contents |
|------|-------|----------|
| `config.json` | Installer writes; agent maintains | Bootstrap config: `server_url`, `agent_version`, `installation_id`, `provision_token`. The agent fills `installation_id` if empty and strips `provision_token` after successful registration (persistent config never holds a secret). If missing entirely, the agent self-bootstraps `{installation_id}` and logs clearly. Identity keys are NOT here — they live in the OS keystore (`MonitorAgentIdentity-<uuid>`). |
| `agent.log` | Agent | Runtime log: stdout/stderr + `log` package output, opened as soon as the instance dir exists. |
| `crash.log` | Agent | Last-gasp panic stack written by the global recovery in `main()`. |
| `uninstall.flag` | Installer/service | Marker-based uninstall state: `pending` (written by the uninstaller) → `done` (after the service revokes the agent and deletes its identity key). |

Plus `C:\ProgramData\MonitorAgent\startup.log` (Linux `/var/lib/monitor-agent/startup.log`) — one-line early-startup log written before `agent.log` is wired up, covering "loadConfig failed", "bootstrapDefaultConfig failed", "agent.log open failed", and "runService error".

> Users diagnosing the agent should look in the ProgramData/var-lib instance dir, NOT the Program Files folder where the binary lives.

## Alternatives Considered

- **Keep one-agent-per-server and duplicate the agent per server** — rejected: contradicts the requirement and multiplies install/keystore footprint.
- **Drop `agents.server_id` entirely** — rejected: too much churn across legacy code/tests; retained as a nullable backward-compatible pointer.
- **Store server config in per-server files on disk** — rejected: requirement explicitly says runtime memory, backend is source of truth.
- **A port/process blacklist** — rejected: Superseded by the per-server filter after the SecOps spotlight requirement (default = all noise-filtered, curated down to the important set). A filter survives port-set churn (new ports appear by default) whereas a blacklist requires constant maintenance.
- **Repair file reporting by backporting the old `bootstrap.json` layout** — rejected: the old layout (exe-relative paths) is the actual bug; the fix is self-bootstrap in canonical dirs.

## Consequences

- New code must use `servers.agent_id` (via `Agent::servers()`, `Server::agent()`); legacy `$agent->server` calls remain for backward compatibility.
- Registration no longer returns 409 for a UUID on a different server; the AgentRefactorTest expectations for takeover/revoke change (revoke only when the displaced agent owns zero servers).
- The agent's heartbeat loop becomes per-server; auth response gains a `servers` array while keeping legacy `server_uuid`.
- The agent filters ports/processes by the per-server filter; the backend no longer re-filters noise so a filtered-in item is never dropped. The backend ping job probes only the filtered-in TCP ports. Port rows persist as history (closed); process rows are no longer deleted each heartbeat.
- Agent binaries must be rebuilt (`scripts/build-agent.ps1`) so the self-bootstrap reaches production.
