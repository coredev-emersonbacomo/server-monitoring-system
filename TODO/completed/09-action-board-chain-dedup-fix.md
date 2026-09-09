---
status: completed
created: 2026-09-01
---

# Action Board: dedupe the board per sustain-chain id ( not per notification node)

## Symptom

The Dashboard Action Board showed related "Disk Usage above threshold" cards for the same
server *simultaneously* — one row created via the metric-chain path (`alert_disk_usage_85`),
another via the `discord_30` notification node (`alert_discord_30`) — even though both belong
to the same sustained chain。

## Root cause

`NodeConfigEngine::buildUpstreamContext()` never included `metric_type`.The action board's
chain id is derived in `SendNotification::syncActionBoard()` from `metric_type + threshold`
→ `alert_<metric>[_threshold]>`.When `metric_type` was missing from the action's
`upstream_context` (it was only present incidentally when the caller's `extraState` / task
`$context` carried it),the fallback `alert_<nodeId>` gave a different `action_type` base
per notification node — so the same chain produced separate board rows。



## Fix

- Added the branch `metric_type` to the `buildUpstreamContext()` return so EVERY
  notification action the engine produces deterministically carries the chain identity
  (`metric_type + threshold`),regardless of what the caller passed in `extraState`/`$context`.
- The pre-existing reconciliation in `syncActionBoard` then collapses stale per-node /
  per-level rows (e.g. `alert_discord_30`, `alert_email_20_1`) into the single metric-based
  item for the chain on a subsequent fire(message match + cleanup loop).

## Regression test

- `tests/Unit/NodeConfigEngineHandleTest.php::test_notification_action_context_carries_metric_type_chain_id`
  — a disk_usage metric → condition → notification config triggered WITHOUT `metric_type` in
  `extraState`;asserts the produced action's `upstream_context` still carries `metric_type=disk_usage`
  and `threshold=85` (so the per-chain board base is `alert_disk_usage_85`).

## Verification

- `vendor/bin/pint --dirty --format agent` → passed
- `php artisan test --compact tests/Unit/NodeConfigEngineHandleTest.php` → 12 passed(57 assertions)

## Notes / follow-up

- Existing stale board rows self-heal:on the next fire of the same chain (`metric_type` now
  always present),the metric row updates and the existing reconciliation loop deletes the
  metric-name-matching stale open rows.These stale rows `alert_discord_30`/`alert_email_20_1`
  can be immediately removed by re-firing the chain once condition still holds.