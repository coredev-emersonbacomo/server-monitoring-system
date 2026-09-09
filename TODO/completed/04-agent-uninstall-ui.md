---
status: completed
created: 2026-08-20
started: 2026-08-20
completed: 2026-08-26
adr: docs/architecture/0001-agent-server-relationship.md
---

# Agent Uninstall UI + Agent Uninstalled Status

## Objective

Expose an **Uninstall Agent** action in the server-details Agent tab (danger zone, mirroring the Info tab's Delete Danger Zone), with an uninstall command modal showing the Linux/Windows uninstall commands to copy and run on the host. When the agent actually sends its uninstall signal (`POST /v1/agent/uninstall`), the server must transition to a distinct **Agent Uninstalled** status (not `archived`, not `pending_installation`) in real time, and the Agent Installation Guide must reappear so the server can be reinstalled.

## Implementation Tasks

- [x] Backend: add `ServerStatus::AgentUninstalled = 'agent_uninstalled'` with label "Agent Uninstalled"
- [x] Backend: AgentController::uninstall sets `agent_uninstalled` (not `archived`); AgentUninstalled event broadcasts that status
- [x] Backend: ProvisioningService::generateToken clears `agent_deleted` so a re-provisioned (re-installed) server can register + heartbeat again
- [x] Backend: DashboardController::stats counts uninstalled servers separately (`agent_uninstalled_count`); DashboardStatsData field added
- [x] Frontend: `agent_uninstalled` in STATUS_CONFIG (badge "Agent Uninstalled") + resolveServerStatusKey ordering
- [x] Frontend: Agent tab Uninstall danger zone + command modal (copy Linux/Windows commands)
- [x] Frontend: AgentInstallationGuide renders for `agent_uninstalled` (Generate Installation Command button)
- [x] Frontend: detail page passes `onAgentUninstalled` to useServerSocket → invalidate queries so status flips live
- [x] Frontend: servers index + grid + dashboard pie include `agent_uninstalled` filter/counts
- [x] Tests: update AgentRefactorTest uninstall assertions to expect `agent_uninstalled`
- [x] Verify: pint, php artisan test, tsc, eslint

## Requirements

- After uninstall the server status badge shows **Agent Uninstalled** — distinct from Archived (deleted servers) and Pending Installation (first install).
- The uninstall command modal is triggered from the Agent tab's danger zone (same visual language as Info tab's delete danger zone).
- Real-time: the detail page listens for the `AgentUninstalled` socket event and refetches in place (no full reload), so the status flips and the installation guide reappears without a page refresh.
- Reinstall works: generating a new provision token clears `agent_deleted`, a fresh agent can register and heartbeat (no-resurrection guard is per-agent via revoked status + cleared flag).

## Decisions

- Uninstall no longer sets `archived` — the server stays visible in active lists (not archived) so it can be re-provisioned. `record_status` remains `active`.
- The existing no-resurrection guarantees are preserved: `agent_deleted=true` stays set on uninstall; a re-provision clears it only when a fresh token is generated.
- AgentInstallationGuide shows the "Generate Installation Command" button for `agent_uninstalled` (like pending_installation), reusing the existing generateProvisionToken flow.

## Deferred / Skipped (known gaps)

- None.

## Verification

- `vendor/bin/pint --dirty --format agent`
- `php artisan test --compact`
- `npx tsc --noEmit` (frontend)
- `npx eslint` (changed files)

## Context Summary

**Status:** Implementation complete; all automated verification passing.

- Backend enum/event/controller/service/dashboard changes are minimal and test-covered (AgentRefactorTest updated).
- Frontend: badge, filter tabs, pie slice, Agent tab danger zone + modal, and the socket-driven real-time flip all wired.
