---
status: complete
created: 2026-08-27
started: 2026-08-27
completed: 2026-09-08
adr: 0004 (docs/architecture/0004-audit-subsystem.md — Accepted)
---

# Hybrid Pagination (cursor default + offset page-jump)

## Objective

Add a reusable, two-mode pagination strategy to the Laravel API: **cursor
pagination by default** (fast seek, no total COUNT) for normal prev/next, and
**offset `paginate()` only when the client explicitly requests a page number**
(jump-to-page-N). The two modes are mutually exclusive (`page` + `cursor`
together is a 422). Apply it to the list-heavy audit endpoints and to any future
list endpoint. On the frontend, extract the currently-local `PaginationControls`
from `MetricsTab` into a shared, non-local component that supports both modes and
is reused by the Logs File Activity / Agent Lifecycle tabs (and anywhere else).

## Grounding (verified in repo)

- Backend: Laravel **13.8**, PHP 8.5, Pest + Pint. Cursor API available:
  `Builder::cursorPaginate($perPage)` returns `CursorPaginator`; `Illuminate\Pagination\Cursor`
  has `encode(): string` + static `decode(string): Cursor`; paginator exposes
  `nextCursor(): ?Cursor`, `previousCursor(): ?Cursor`, `hasMorePages(): bool`,
  `perPage()`. `request->validate()` throws `ValidationException` → 422 JSON.
- Current audit list endpoints: `AuditController::fileActivity` / `agentLifecycle`
  call `->paginate($request->integer('per_page', 50))` and return
  `FileActivityLogResource::collection($results)` (Laravel paginate envelope:
  `{ data, links, meta:{current_page,...} }`). Frontend (`useAuditLogs.tsx`)
  casts to a local `PaginatedAudit` and reads `meta.current_page/last_page/total`.
- Ordering today is `orderByDesc('occurred_at')` only → NOT deterministic for
  equal timestamps (requirement: add `->orderByDesc('id')`).
- Indexes on `file_activity_logs` / `agent_lifecycle_events`: `(server_id, occurred_at)`,
  `(agent_id, occurred_at)`, plus `action`/`event_type`/`source_path` singles.
  No composite `(occurred_at, id)` yet.
- Frontend: `MetricsTab.tsx` defines a **local** `PaginationControls`
  (page/pageCount/total/onPage, `PAGE_SIZE = 10`) used for the processes/ports
  tables — but those are paginated **client-side** (full dataset fetched, then
  sliced: `processPageCount = ceil(sortedProcesses.length / PAGE_SIZE)`), so the
  backend hybrid does NOT apply there. The earlier `system-logs` added its own
  duplicate `components/PaginationControls.tsx` (page mode only).

## Requirements (from request)

1. Default to `cursorPaginate()`; `per_page` configurable with a max (200).
2. Explicit `page` param → `paginate()` (offset). Used only for page jumps.
3. `page` + `cursor` together → 422. Never silently fall back between modes.
4. Filtering/search/date-range/server/status applied **before** pagination (DB-level).
5. Response exposes `meta.pagination` with `mode` + the right fields:
   - cursor: `per_page, has_next, has_previous, next_cursor, previous_cursor` (NO total).
   - page: `current_page, per_page, last_page, total, has_next, has_previous`.
6. Cursor mode must NOT run a `count()` (no total). Page mode may (it needs `total`).
7. Frontend uses cursor for Prev/Next; page mode only for "Jump to page N".
8. Reusable helper (no per-controller duplication).
9. Validation: `per_page 1..max`, `page >= 1`, valid `cursor`, modes exclusive.
10. Index review: add `(occurred_at, id)` composite where beneficial; don't add
    redundant indexes blindly.
11. Tests: default cursor, cursor next, cursor prev, custom per_page, max per_page,
    `page=1`, arbitrary jump, invalid page, invalid per_page, page+cursor,
    filter+cursor, filter+page, deterministic order on equal `occurred_at`, empty,
    last page, no total in cursor mode. Assert SQL stays DB-level (no in-memory
    collection pagination).

## Implementation Tasks

### Backend — reusable helper [DONE 2026-08-27, hardened 2026-09-08]
- [x] `app/Services/HybridPaginator.php`:
  - `resolve(Request, int $max=200): array` — 422 if `page`+`cursor`; validate
  - `paginate(Builder $query, Request, string $resourceClass, int $max=200): JsonResponse`
- [x] 2026-09-08 hardening: `page`+`cursor`/`previous_cursor` → 422 (was silent
  page-mode win); non-numeric/`page<1` → 422; undecodable or wrong-shape cursor →
  422 (was silent restart / potential 500 on missing keys). Only the two audit
  endpoints consume the helper; the frontend never sends both params.

### Backend — apply to audit endpoints [DONE]
- [x] `AuditController::fileActivity` / `agentLifecycle`: replace `paginate` +
  resource-collection return with `HybridPaginator::paginate($query, $request,
  FileActivityLogResource::class)` (and `AgentLifecycleEventResource`).
- [x] Change ordering to `orderByDesc('occurred_at')->orderByDesc('id')` in both.
- [x] Drop the now-redundant inline `per_page` validation if `resolve()` covers it
  (keep filter validation; ensure no double-fail confusion).

### Backend — index [DONE]
- [x] New migration `2026_08_27_000002_add_cursor_order_indexes.php`:
  `$table->index(['occurred_at','id'])` on `file_activity_logs` and
  `agent_lifecycle_events` (supports cursor order; does not conflict with the
  existing `server_id/agent_id + occurred_at` indexes used by filtered queries).

### Frontend — shared PaginationControls [DONE]
- [x] Create `frontend/src/components/PaginationControls.tsx` (shared, non-local)
  supporting both modes via a `pagination: PaginationMeta` prop + `onNext`/`onPrev`/
  `onJumpTo`:
  - mode `page`: Prev/Next + jump-to-page input + "Showing X–Y of Z" (mirrors current).
  - mode `cursor`: Prev/Next (from `has_previous`/`has_next`, using cursors) + a
    "Go to page" input calling `onJumpTo` (which switches the caller to page mode).
- [x] `MetricsTab.tsx`: delete local `PaginationControls`; import the shared one.
  Build a `pagination` object from its client-side `processPage`/`portPage` state
  (mode always `page`) so behavior is unchanged.
- [x] Delete `frontend/src/pages/system-logs/components/PaginationControls.tsx`.

### Frontend — hybrid wiring for Logs [DONE via usePaginatedTable, supersedes spec]
- [x] `useAuditLogs.tsx`: redefine response type to
  `{ data: T[]; meta: { pagination: PaginationMeta } }`; queries pass `cursor`/
  `page`/`per_page` and return the new envelope (keep `server_name` already added).
- [x] New `hooks/useHybridPagination.ts`: manages `mode`/`cursor`/`page`/`perPage`;
  exposes `params()` (one of `cursor` or `page`, never both), `next(meta)`,
  `prev(meta)`, `jumpTo(page)`, `reset()` (filter change → back to first cursor page).
- [x] `system-logs/index.tsx`: use `useHybridPagination` for File Activity + Agent
  Lifecycle; pass `pagination={query.data?.meta?.pagination}` + onNext/onPrev/onJumpTo
  to the shared `PaginationControls`. Reset pagination when filters change.
- NOTE (2026-09-08): implemented as `pages/system-logs/hooks/usePaginatedTable.ts`
  instead of a top-level `useHybridPagination.ts` — same contract (mode/cursor/page/
  perPage, never both, filter change resets) plus URL-namespaced keys so two tables
  share one page without colliding. The spec'd filename was not created; the hook
  is the reusable unit.

### Tests [DONE — 14 tests, full §11 matrix 2026-09-08]
- [x] `tests/Feature/AuditPaginationTest.php` (Pest) covering the §11 matrix against
  `/v1/audit/file-activity` and `/v1/audit/agent-lifecycle` (JWT admin auth, like
  `AuditTest`). Include deterministic-order case (factory rows sharing `occurred_at`,
  assert `id` DESC tiebreak) and "no `total` key in cursor mode" assertion.
- [x] `php artisan test --compact tests/Feature/AuditPaginationTest.php` green.

## Decisions
- Reusable helper lives in `App\Services\HybridPaginator` (one class, static methods)
  rather than a base-controller trait — keeps it importable without inheritance.
- Response keeps `data` + `meta.pagination` (wraps Laravel's paginators) instead of a
  brand-new envelope, so existing `data` consumers keep working; the new `meta.pagination`
  is additive.
- Frontend `MetricsTab` stays client-side paginated (its data is fetched whole); only
  the presentational component is extracted/shared. The hybrid (cursor) path is used by
  server-paginated list endpoints (audit logs).
- `per_page` max = 200 (matches existing `max:200` in the controllers).

## Verification
- `vendor/bin/pint --dirty` (changed PHP); `php artisan test --compact tests/Feature/AuditPaginationTest.php`
  (+ re-run `AuditTest.php` to confirm no regression).
- `cd frontend; npx eslint` on changed TSX; `npx tsc -b` (only pre-existing `docs/*`
  errors expected).
- Manual: Logs File Activity — Next/Prev advance via cursors (no total shown); "Go to
  page N" switches to offset mode and shows total; `page`+`cursor` → 422 in API.

## Status
Not started. Captured as a plan so an unrelated fix can land first; implement when
resumed.
