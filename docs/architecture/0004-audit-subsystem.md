# ADR-0004: Audit Subsystem (File Activity + Agent Lifecycle)

## Status

Accepted

## Context

The product needs an auditable record of filesystem activity on monitored servers
and of the monitoring agent's own lifecycle, surfaced through the existing Logs
system — without a parallel config/log/sync channel. File activity and agent
lifecycle are conceptually separate but both associated with the correct server +
agent. Watched paths must be database-backed configuration delivered to the agent
through the *existing* configuration mechanism (auth response + `config.update`
WebSocket broadcast), not hardcoded behavior.

## Decision

1. **Two dedicated tables** (`file_activity_logs`, `agent_lifecycle_events`), both
   `server_id`/`agent_id`-scoped, surfaced through the Logs API/UI. This keeps file
   activity and lifecycle conceptually separate while reusing the Logs frontend and
   authorization. `watched_paths` is a third table holding the configuration.
2. **Watched paths are delivered through the existing config mechanism.** The agent
   session payload (`AgentAuthService::issueSession`) gains a `config.watched_paths`
   list, and `AgentConfigUpdated` (the `config.update` WebSocket broadcast) carries
   `watched_paths` for live re-sync. No new sync channel. The port/filter delivery
   pattern is reused.
3. **Agent durable queue** (deferred to the Go agent work) is a JSON-lines file in
   the instance dir with a per-event `uuid`; the backend enforces idempotency by
   `uuid` on both ingestion endpoints; the queue is bounded. The backend never
   appends duplicate rows for a retried `uuid`.
4. **`WatchedPath` scoping**: `scope` ∈ {agent, server}. The default
   `%ProgramData%\MonitorAgent` is agent-scoped and always-on (self-monitoring,
   never excluded as a system dir). `server`-scoped paths require `server_id` and
   apply only to servers the owning agent monitors.
5. **Move/rename correlation** happens in-agent (deferred to Go work) with backend
   dedup as backstop.
6. **Unexpected disconnect** is detected backend-side: when a server's heartbeat
   times out (`MonitorServer` offline transition), an `unexpectedly_disconnected`
   lifecycle event is recorded — but only if no `stopping`/`stopped` graceful event
   was already recorded within the grace window. A graceful shutdown wins over a
   timeout.
7. **Ownership is enforced at ingestion**: each event's `server_uuid` is resolved to a
   server the authenticated agent actually owns; mismatched associations are skipped,
   never attached to the wrong server/agent.

## Alternatives Considered

- Single combined audit table: rejected — file activity and lifecycle have different
  shapes and lifetimes; separating keeps queries and the Logs UI clean.
- New WebSocket/config channel for watched paths: rejected — reuses the proven
  auth + `config.update` delivery instead of a parallel mechanism.
- Backend-side move/rename correlation: rejected — the agent has native notification
  ordering context; correlation lives in-agent with backend dedup as backstop.

## Consequences

- The Go agent must implement `fswatch`/`eventqueue`/config-sync/lifecycle emission
  (tracked as remaining work in the active TODO).
- The frontend Logs page and Settings section must render the new data (tracked as
  remaining work).
- New ingestion endpoints (`/agent/audit/file-activity`, `/agent/audit/lifecycle`)
  are agent-authenticated via the existing signed session; new Logs endpoints
  (`/audit/file-activity`, `/audit/agent-lifecycle`) and watched-path CRUD
  (`/watched-paths`) are JWT/admin-gated, matching existing conventions.

## Revisit Triggers

- **fsnotify approval**: if the dependency is not approved, implement
  ReadDirectoryChangesW/inotify directly (no new dep).
- **Linux username/process attribution** best-effort/null until a privileged source
  exists.
- **`stopped` reliable send** is best-effort; unexpected termination relies on
  backend heartbeat-timeout by design.
