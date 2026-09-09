---
status: active
created: 2026-08-19
started: 2026-08-19
adr: none
---

# Processes & Ports: CPU Calc Fix, Processes UI (rename/sort/search), Reported-at Timestamps, Agent Noise Filter, Filter Bug

## Objective

Tighten the processes & ports reporting and UI in server details (Metrics tab):

1. **BUG** — After saving the monitoring filter, the processes the agent sends become empty. Root-cause and fix (suspect filter/name mismatch or null-vs-empty serialization).
2. Fix the per-process CPU usage calculation in the agent (wrong values reported).
3. Add the agent's built-in **noise filter** for processes (the DB filter ≠ noise filter; noise processes must be dropped so the "all" view is clean).
4. Add a **reported-at timestamp** for ports and processes so the frontend can show "… ago".
5. Metrics tab **Processes UI**: rename "Top Processes" → "Processes" (a filter now exists), order by CPU desc by default, sortable by column (like the logs table), fixed table layout so changing values never shift alignment, and a **search box** in the process list and port list.
6. Add **search** in the Monitoring Filter modal (ports + processes).
7. Paginate the Metrics tab Processes + Ports tables (10 per page) without layout shift when the last page has fewer rows.
8. Split the Monitoring Filter into two buttons/dialogs (ports / processes), each icon-only and placed left of its list's search bar.
9. Agent: only send the discoverable available set (`available_processes`/`available_ports`) when it actually changes, not every heartbeat.

Related (previously started, uncommitted): reserve scrollbar space in the protected layout so opening a modal doesn't shift the UI (see Deferred section).

## Implementation Tasks

- [x] Diagnose + fix: saving monitoring filter → agent sends empty processes.
      ROOT CAUSE (2026-09-08): case mismatch. `available_processes` (and the DB
      filter saved from it) carry lowercase names via `processSetSignature`,
      while `FilterProcesses`/`IsProcessAllowed` compared the collected
      original-case names verbatim — saving any filter matched ~nothing.
      Fixed in `runtime.go`: `stringSet` normalizes (lower/trim, nil stays nil)
      + all four lookups (processes + networks) compare normalized.
      Regression test `TestFilterProcessesMatchesAcrossCase`. Backend PATCH
      semantics (absent=keep, null=all, []=none) and the split frontend dialogs
      were verified correct and untouched.
- [x] Fix per-process CPU calculation. [2026-09-08: already fixed in code —
      Windows uses Win32_PerfRawData two-sample deltas (`metrics_windows.go`),
      Linux samples /proc counters instead of `ps %cpu` lifetime average
      (`metrics_linux.go:354`). TODO text was stale.]
- [x] Add built-in process noise filter in the agent. [2026-09-08: present on
      both platforms (`processNoiseNames`, metrics_windows.go:337 /
      metrics_linux.go:283) with explicit-allow override preserved through
      collector → cap → filter.]
- [x] Add reported-at/last-reported timestamp to ports + processes payload.
      [2026-09-08: backend sends `last_seen` ISO (ServerData.php:215,223);
      frontend Reported column already done below.]
- [x] Processes UI (MetricsTab): rename to "Processes", default sort CPU desc, sortable columns, fixed column widths (no shift), search box in list
- [x] Monitoring Filter modal: search box for ports and processes
- [x] Metrics tab Processes + Ports lists paginated (10 per page, Prev/Next + count)
- [x] Metrics tab pagination height: measured single row height × reserved rows (10 when >1 page, else `total % 10`), + header, applied as `min-height` on the table wrapper so the last page (fewer rows) reserves the same space as a full page — pagination never shifts
- [x] Metrics tab Reported column sortable (by `last_seen`; ascending = most recent first, matching the "x ago" display), applied to Processes + Ports tables
- [x] Split Monitoring Filter into two dialogs (ports / processes), each saving only its own filter field; buttons are icon-only, placed left of each list's search bar; search bar stretches to match button height (`items-stretch`)
- [x] Agent available-on-change: `processSetSignature`/`portSetSignature` (sorted unique name/port sets) + package-level `lastSentProcesses`/`lastSentPorts`; `sendHeartbeatStep` sends `available_processes`/`available_ports` only when the identity set changes, omitting them otherwise (`omitempty`)
- [x] Rebuild agent binaries (`scripts/build-agent.ps1` — bumped `AgentVersion` to 2.2 + WS broadcast) + `agent:version-sync` → agent self-updated to 2.2 and verified live (Telescope: heartbeat at 14:27:16 omitted both available sets because the name set was unchanged since 14:27:08; sets reappeared at 14:27:24 after a real change)

## Requirements

### Process CPU semantics
- CPU% shown should be the standard "% of total machine CPU" (a process pegging one core on a 12-core box ≈ 8.3%). Fix any double-core-counting or lifetime-average (Linux `ps %cpu`) mistakes.

### Processes list (Metrics tab)
- Header "Processes" (not "Top Processes").
- Default order: CPU descending.
- Columns sortable: PID, Name, CPU, RAM (+ Reported). Clicking a column toggles asc/desc; active column shows a direction indicator (match the logs table pattern).
- Fixed table layout with stable column widths so changing numbers do not reflow columns.
- Search box above the table filters rows by name/pid (client-side).

### Ports list (Metrics tab)
- Search box filters rows by port number / protocol / process name.

### Monitoring Filter modal
- Search box for the ports list (by port number / descriptor) and for the processes list (by name).

### Reported-at timestamps
- Agent already sends ports + processes every heartbeat; the backend `Process`/`Port` rows already store `last_seen`. Expose it: `PortsData.last_seen` / `ProcessesData.last_seen` (ISO), frontend renders relative "x ago" (e.g. "12s ago"). Column headers: "Reported".

### Agent noise filter (processes)
- The DB filter (`process_filter`) is separate. The built-in noise filter should drop OS/system/idle noise processes before the DB filter applies. Windows: drop `Idle`, `_Total`, `System`, `Registry`, `dwm`, `svchost`, `lsass`, `services`, `csrss`, `wininit`, `winlogon`, `smss`, `spoolsv`, `dashost`, `conhost`, `RuntimeBroker`, `SearchHost`, etc. Linux: drop `systemd`, `kworker*`, `ksoftirqd*`, idle threads, etc. Keep DB-listed processes even if noise (explicitly filtered-in must never be dropped).

## Decisions

- Frontend search is client-side over already-fetched data — no new API needed.
- Reported-at reuses existing `last_seen` on `processes`/`ports` rows — no schema change.
- Pagination height is reserved by measuring a single real row + header (`getBoundingClientRect` in `useLayoutEffect`) and applying `min-height = header + rowH × (total > 10 ? 10 : total % 10)` on the table wrapper. Not spacer rows (empty cells collapse shorter than real rows) and not a hardcoded `min-h`.
- Reported sort is "ascending = most recent first" (reversed timestamp compare), because the column renders relative "x ago" text.
- Monitoring Filter split into two dialogs (ports / processes); each dialog saves only its own filter field via the same PATCH endpoint.
- Agent available-on-change uses identity signatures (sorted unique process-name set / port-number set), not raw payloads, so CPU/pid churn never triggers a re-send. Sent under `omitempty`; backend keeps the last snapshot when the keys are absent.

## Deferred / Skipped (known gaps)

- [x] Reserve scrollbar space in the protected layout (modal open shifts UI).
      [2026-09-09: the claimed html-scrollbar-gutter rule did NOT exist in frontend/src/index.css (verified) — that absence WAS the bug. Added scrollbar-gutter: stable to @layer base. Radix Dialog scroll-locks via body overflow, so a permanently reserved gutter removes the shift. Visual confirmation needs a browser.] Earlier request, superseded by this task stream; revisit when this task is done. `index.css` already has `html { scrollbar-gutter: stable }` — verify why it doesn't hold when Radix Dialog scroll-locks.

## Verification

- Root-cause test for the filter-empties-processes bug (agent logs + DB filter + names).
- `go build ./...` + `go test ./...` in `resources/agent/go`
- `vendor/bin/pint --dirty --format agent`
- `php artisan test --compact` for affected tests
- Frontend `tsc` (with `--ignoreDeprecations 6.0` workaround) + eslint on touched files
- Manual: open Metrics tab, sort columns, search lists, open filter modal, save filter → processes still report
- Live: filter only sends checked items (DB `processes`/`ports` rows — non-checked names go stale, ports flip to `closed`, never deleted); available sets sent only on change (Telescope heartbeat payloads — sets omitted when the identity signature is unchanged; backend `available_*` keeps last snapshot via the `isset` guard in `HeartbeatService`)
- Go: `TestAvailableSetSignatures` in `runtime_test.go` (same set → same signature regardless of CPU/pid order; different set → different signature)

## Context Summary

(placeholder — will be filled as work progresses)