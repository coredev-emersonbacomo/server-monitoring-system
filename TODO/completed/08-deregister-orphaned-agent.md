---
status: active
created: 2026-08-27
started: 2026-08-27
adr: 0002
---

# Deregister (clear orphaned agent DB record) from dashboard

## Objective
Add a dashboard "Deregister" action on the server-detail Agent tab, beside Uninstall,
so an operator can clear an orphaned agent DB record when the host agent was already
uninstalled/removed but its record still lingers in the backend (the script-based
uninstall could not notify the backend). The action only clears the DB relation; it
issues no host command. It is gated on agent liveness so a still-active agent cannot
be wiped from the dashboard.

## Implementation Tasks
- [x] Agent::isAlive() liveness helper (offline_threshold vs last_seen_at)
- [x] AgentController::deregister (auth:jwt) — 422 no agent, 409 if alive, else revoke + detach servers like uninstall()
- [x] Extract shared revokeAgentRecord() from uninstall()
- [x] Route POST /api/v1/servers/{uuid}/deregister under auth:jwt
- [x] AgentData/ServerData is_alive flag + frontend type
- [x] AgentTab Deregister button + confirmation dialog with guidance text
- [x] uninstall.ps1 log points to dashboard Deregister when instance dir missing
- [x] Feature test for deregister

## Requirements
- Backend deregister must mirror uninstall() DB effects (revoke agent, mark servers
  agent_uninstalled, fire events, activity log) but actor = dashboard user.
- Liveness gate uses offline_threshold (reuse ServerData computation: ms vs seconds).

## Decisions
- Naming: "Deregister" not "Force Uninstall" — it only clears the DB record, no host action.
- Removed an unreachable "already revoked" 409 branch: once deregistered, server.agent_id
  is nulled, so the relation no longer resolves and the endpoint reports 422 instead.

## Verification
- `php artisan test --filter=deregister` → 4/4 pass.
- `php artisan test --filter=AgentRefactor` → 21/21 pass (refactor safe).
- Frontend `tsc --noEmit` → no new errors in AgentTab/models.ts (pre-existing errors only in docs/*).

## Context Summary
Added a dashboard "Deregister Agent (clear record)" action on the server-detail Agent
tab, beside Uninstall. It clears an orphaned agent DB record when the host agent was
already removed but its backend entry lingers (the marker-based uninstall script could
not reach the backend). Backend: new `POST /api/v1/servers/{uuid}/deregister` (auth:jwt),
liveness-gated via `Agent::isAlive()` (offline_threshold vs last_seen_at) so a still-
reporting agent is refused (409). Shared `revokeAgentRecord()` extracted from `uninstall()`.
`AgentData`/`ServerData` carry `is_alive` to disable the button when the agent is live.
`uninstall.ps1` now tells the operator to use the dashboard Deregister action when the
instance dir is missing. Tests cover clear/success, refuse-while-alive (409), no-record
(422), and safe-repeat (422).

## Deferred / Skipped (known gaps)
None.
