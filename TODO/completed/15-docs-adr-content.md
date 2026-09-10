---
status: completed
created: 2026-09-10
started: 2026-09-10
completed: 2026-09-10
adr: none
---

# ADR Documentation in Docs Site (DocsAdrContent)

## Objective

Replace the "Under construction" placeholder in `DocsAdrContent` across both documentation workspaces (`docs/` standalone site and `frontend/` embedded docs viewer) with comprehensive, structured documentation of all 5 Architecture Decision Records (ADR-0001 to ADR-0005).

## Implementation Tasks

- [x] Draft and implement complete ADR documentation in `DocsAdrContent` covering:
    - Overview: what ADRs are, lifecycle status (Accepted, Partially Superseded), and where the markdown source files live (`docs/architecture/`).
    - Summary matrix / table of all 5 ADRs with status and scope.
    - ADR-0001: Agent-Server Ownership Model and Agent Self-Bootstrap (1:N model, self-bootstrap in ProgramData/var-lib, per-server runtime filters).
    - ADR-0002: Single Agent per Physical Computer (singleton service, detect-and-attach installer, split Detach Server vs Uninstall Agent lifecycle, aggregated heartbeat).
    - ADR-0003: Per-Interface Network Traffic with Checklist Filter (all non-loopback interfaces, TimescaleDB hypertable + 5 CAGGs, live broadcast delta MB/s, checklist filter).
    - ADR-0004: Audit Subsystem (file activity and agent lifecycle tables, watched paths via auth/WS config updates, durable JSON-lines queue, backend timeout disconnect detection).
    - ADR-0005: Agent Delivery Semantics (bounded heartbeat retry, no metric backfill, durable disk queue for irreplaceable audit events, command deduplication).
- [x] Ensure byte-identical parity between `docs/src/components/docs/DocsTechnicalContent.tsx` and `frontend/src/components/docs/DocsTechnicalContent.tsx`.
- [x] Verify build and TypeScript compilation across both `docs` and `frontend` workspaces (`npm run build --prefix docs` and `npm run build --prefix frontend`).

## Context Summary

Replaced the "Under construction" placeholder in `DocsAdrContent` across both `docs/src/components/docs/DocsTechnicalContent.tsx` and `frontend/src/components/docs/DocsTechnicalContent.tsx`. The component provides an Overview of ADRs in the system architecture, an index table with status badges and deep-links, and comprehensive technical summaries for ADR-0001 through ADR-0005 detailing problem context, key decisions, and constraints. Both files were verified byte-identical (`fc.exe /b`), and production builds for both `docs` and `frontend` passed cleanly.
