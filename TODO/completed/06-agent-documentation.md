---
status: completed
created: 2026-08-20
started: 2026-08-20
completed: 2026-08-20
adr: none
---

# Agent Documentation (User Guide + Technical Reference)

## Objective

Create comprehensive technical documentation for the Server Monitoring Agent
inside the existing React documentation site (`frontend/src/components/docs/`),
based on the actual investigated codebase, not the prompt's assumptions.
Split between a User Guide (install/operate/troubleshoot) and Technical
Reference (agent internals, storage, auth, security).

## Implementation Tasks

- [x] Verify remaining backend details directly (`ServerController::updateMonitoringConfig`, `PingServerPorts`) — null vs array filter semantics confirmed.
- [x] Write User Guide: `DocsAgentInstallContent.tsx` (install commands, provision token, lifecycle statuses, Agent tab, uninstall, troubleshooting).
- [x] Write Technical Reference: `DocsAgentArchitectureContent.tsx` (startup, CLI, runtime, source layout).
- [x] Write Technical Reference: `DocsAgentIdentityContent.tsx` (UUID + RSA keypair, per-platform storage, fingerprints, lifecycle).
- [x] Write Technical Reference: `DocsAgentStorageContent.tsx` + click-driven storage demo (disk / keystore / memory; what survives restart/reboot/update/uninstall).
- [x] Write Technical Reference: `DocsAgentMonitoringContent.tsx` + PROD/DEV multi-server demo (heartbeats, port/process filters, backend ping).
- [x] Write Technical Reference: `DocsAgentSecurityContent.tsx` (challenge-response, channel auth, local protection, uninstall revocation).
- [x] Wire sections into `DOC_SECTIONS`/`PAGES`; collapse to ONE sidebar item "Agent" with the 6 pages as nested sidebar sub-items.
- [x] Add deep-dive forward links from existing `DocsAgentContent`; fix outdated status list in `DocsServersContent` (removed non-existent "Warning"/"Pending Deletion", added `agent_uninstalled`).
- [x] Verification: `tsc -b --noEmit` and `eslint` clean for all touched docs files (pre-existing unrelated tsc errors remain in `src/pages/system-logs/hooks/useActivityLogs.tsx`).

## Requirements

- Follow existing docs-site conventions (Section/SubSection/InlineCode/Callout/CodeBlock, no Markdown, no new framework).
- Interactive demos must be click-driven `useState` only (no timers) because the hidden TOC parser mounts content twice.
- Source-of-truth order: AGENTS.md → actual source → DB migrations → installers → existing docs → prompt (last).
- Phase 14 (`config.json`/`agent.log` location) is FIXED — files live in ProgramData (`C:\ProgramData\MonitorAgent\instances\<uuid>\` on Windows); not an open question.

## Decisions

- One sidebar entry "Agent" (Technical Reference) instead of six; the six pages are registered in `PAGES`, hidden from `DOC_SECTIONS`, and rendered as nested sidebar sub-items via `PARENT_SECTION`/`SIDEBAR_SUBS`. Nested labels drop the "Agent " prefix (e.g. "Architecture").
- Sub-pages support in the docs router: `PARENT_SECTION` maps a sub-page id to its parent sidebar section; pager and breadcrumb derive from the parent; the hidden TOC parser mounts every `PAGES` entry so sub-pages get "On this page" TOCs.
- Docs `DocsSidebar`/`DocsNav` extended with an optional `subItems` prop (nested buttons + active highlight for both desktop and mobile navs).
- Existing `DocsAgentContent` kept as the Agent landing page with "Deep dive" links; corrected stale facts in `DocsServersContent` status list to match the real `ServerStatus` enum.

## Deferred / Skipped (known gaps)

- No new ADR: documentation-only change, no architectural decision made.
- Pre-existing `useActivityLogs.tsx` tsc errors left untouched (unrelated to docs).
- Uninstall command CLI arg semantics (generated one-liners pass a token where scripts expect an instance) noted but not changed — backend/UI behavior documented at the marker-flow level.

## Context Summary

Agent docs written and wired. Six new content components live under
`frontend/src/components/docs/`: `DocsAgentInstallContent` (User Guide) plus
`DocsAgentArchitectureContent`, `DocsAgentIdentityContent`,
`DocsAgentStorageContent` (with storage demo), `DocsAgentMonitoringContent`
(with multi-server demo), `DocsAgentSecurityContent`. The docs router in
`frontend/src/pages/docs/index.tsx` gained sub-page support: `PARENT_SECTION`
maps sub-page ids to the "Agent" sidebar section, `SIDEBAR_SUBS` feeds nested
sub-items into the sidebar (`DocsSidebar.tsx` now accepts `subItems`), and the
hidden TOC parser mounts all `PAGES` entries so sub-pages get "On this page"
TOCs. `DocsAgentContent` links forward to all six; `DocsServersContent` status
list corrected. Verified with `tsc -b --noEmit` and `eslint` (clean for docs
files; unrelated pre-existing tsc errors remain in system-logs hooks). No TODO
files existed in the repo before this record; this file is the only work-state
artifact. Next session: continue from here or begin the next task; the docs
feature is complete and only a commit (when explicitly requested) remains.