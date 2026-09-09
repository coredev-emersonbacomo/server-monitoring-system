---
status: complete
created: 2026-08-27
completed: 2026-09-08
---

# Standardize paginated log endpoints + URL-driven LogTable

## Objective
Refactor log listing so: (a) every paginated GET returns one consistent envelope
`{ data, prev, next, total, per_page }` where `prev`/`next` are page numbers (OpenAPI
validates the `?page=` URL, server never supplies URLs); (b) `LogTable` fetches itself
from a `url` prop and reads filter/sort/page state from the browser URL via
`useSearchParams` instead of local `useState`.

## Implementation Tasks
- [x] Backend: shared envelope via `PaginatedResponse` concern (prev/next = page ints).
- [x] Backend: apply envelope to `ActivityLogController` (activity/health/agent/billing).
- [x] Backend: apply envelope to `AuditController` (file-activity/agent-lifecycle).
- [x] Frontend: `LogTable` fetches from `url` prop, state via `useSearchParams`.
- [x] Frontend: `PaginationControls` uses `prev`/`next` page numbers + `total`/`perPage`.
- [x] Frontend: update consumers (system-logs page, `AgentLogsSection`) to pass `url`.
- [x] Frontend: update `FileActivityTable`/`LifecycleTable` + hooks to new envelope + URL state.
- [x] Regenerate OpenAPI types (`scramble:export` + `npm run types`).
- [x] Tests: backend envelope shape + `server_uuid` filter; frontend typecheck.

## Requirements
- `prev`/`next` are nullable ints (page numbers), never URLs.
- Endpoints keep accepting the same query params (page, per_page, search, action, user,
  start_date, end_date, sort_field, sort_dir, server_uuid).
- No `useState` for filter/page state inside `LogTable`; driven by URL.

## Deferred / Skipped (known gaps)
- None.
