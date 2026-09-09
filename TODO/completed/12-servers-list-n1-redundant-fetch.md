---
status: active
created: 2026-09-08
started: 2026-09-08
adr: none
---

# Servers list N+1 + redundant fetches

## Objective

Visiting `/servers` fires 2× `GET /v1/servers` (5.2s/1336 queries + 2.7s/647 queries,
627–1316 duplicated) plus 2× `GET /v1/clients` with modals closed.
Kill the N+1 at its root and stop fetching on page load what is only needed on modal open.

## Implementation Tasks

- [x] Lean servers list payload + eager loads
    - [x] `app/Data/ServerListData.php` (card fields only, read-only status, no writes)
    - [x] `ServerController::listAll` uses it; eager `client.secopclients`, `agent`, `activeProvisionToken`; drop `latestUpdate` + `withCount('agents')`
    - [x] `Setting::get` cached (`rememberForever`, bust in `set()`)
- [x] Gate client fetches behind modal open (`enabled: open` in both dialogs)
- [x] Pest test: bounded query count on `GET /v1/servers` + envelope/fields intact
- [x] `vendor/bin/pint`, `php artisan test`, frontend `tsc` on changed files

## Requirements

- Paginator envelope (`data/total/last_page/...`) unchanged — `ServerListPaginationTest` + `useInfiniteServers` depend on it.
- Card fields intact: `uuid, name, client_uuid, client_name, description, status, record_status, agent_deleted, is_assigned_to_current_user`.
- Status semantics match detail view (offline transition writes stay on detail/heartbeat/`MonitorServer` paths).
- Filter badge counts stay exact (keep the `per_page=200` counts query; it goes fast via the lean payload).

## Decisions

- New `ServerListData` DTO instead of slimming `ServerData::fromModel`: list cards use 8 scalars, detail needs ports/processes/activities/agent — sharing one mapper is the over-fetch. Detail path untouched.
- Keep write-on-read offline transition in `ServerData::fromModel` as-is; list mapper is read-only (`MonitorServer` job already owns transitions).
- Badge counts ride on the list response (`counts` key, 9 indexed COUNTs sharing the client/search scope) instead of a second `per_page=200` fetch or a separate endpoint — one request, exact badges, no new route.

## Deferred / Skipped (known gaps)

- [ ] `DashboardController::stats` loads ALL servers + per-row `checkTokenExpiration` — revisit if stats exceeds 500ms after `Setting` cache (aggregate in SQL instead). Sweep 2026-09-08: 10 queries / 151ms — no action.
- [x] `ServerController::index` (per-client) + `ClientController::servers` still use full `ServerData::fromModel` per row — switch to `ServerListData` if those endpoints show N+1 in Telescope. Sweep 2026-09-08: CONFIRMED, `ClientController@servers` runs 19 queries for 2 rows — switch to `ServerListData`. DONE 2026-09-08: `ClientController@servers` lean (bounded-query test); unreachable `ServerController@index` + its shadowed route deleted (route:list proves `ClientController@servers` wins).
- [x] `UserController@clients` runs 24 queries (missing `withCount`/`with` that `ClientController@index` already has) — copy that pattern. DONE 2026-09-08, bounded-query test.
- [x] `ReportController@generalReport` lazy-loads `$client->servers` per client (17 queries) — rare endpoint, fix only if slow in prod. DONE 2026-09-08: constrained-eager 24h `servers.updates` in `buildClientData` (same pattern `buildGeneralData` already used); bounded-query test on `reports/client/{uuid}`.
- [x] BUG: `GET /servers/{uuid}/report` 500s — `ServerReportController:22` calls `$server->serverUpdates()`, relation is `updates()`. FIXED 2026-09-08, covered by `SweepFixesTest`.
- [x] BUG: `GET /clients/{c}/servers/{s}/cost-logs` 500s — route targets `ServerController@costLogs`, method doesn't exist. FIXED 2026-09-08: route deleted (no model, no frontend usage, nothing references cost-logs anywhere); 404 asserted in `SweepFixesTest`.
- [x] BUG: unauthenticated non-JSON requests 500 (`Route [login] not defined`) instead of 401 — `Authenticate::redirectTo` builds `route('login')` before `shouldRenderJsonWhen` can act. FIXED 2026-09-08: `redirectGuestsTo(null)` in `bootstrap/app.php` (no web login route exists; SPA+JWT). Covered by `AuthTest` non-JSON 401 test.

## Verification

- Pest: new `ServerListQueryCountTest` + existing `ServerListPaginationTest`.
- `vendor/bin/pint --dirty --format agent`.
- `cd frontend; npx tsc -b` on changed TSX.
- Manual: `/servers` Telescope shows 2 fast `/v1/servers` calls, zero `/v1/clients` until modal open.
- QA sweep 2026-09-08: all 37 GET endpoints hit + Telescope correlated. Full suite 173 tests / 737 assertions green (was red: ~25 `actingAs($user,'jwt')` tests 401'd because `JwtGuard::setRequest` wiped the acting user — fixed by honoring `setUser` in `user()`). Route-action audit: 0 dangling controller@method references. eslint + tsc clean on changed frontend files.
