---
status: completed
created: 2026-09-10
started: 2026-09-10
completed: 2026-09-10
adr: none
---

# Docs accuracy audit (placeholders + discrepancies)

## Objective

Confirm no WIP/placeholder docs sections remain and find claims in the docs site that contradict the code.

## Implementation Tasks

- [x] Sweep docs site + README for placeholder markers
- [x] Cross-check agent docs vs Go code / install scripts / agent backend
- [x] Cross-check backend/API docs vs Laravel code (scheduler, channels, routes, env)
- [x] Cross-check deployment docs vs scripts / compose / env files
- [x] Report findings; fix only if user approves
- [x] Fix all verified mismatches (user chose "fix everything")
- [x] Verify docs build (tsc + vite passing)

## Context Summary

Placeholder sweep: clean — credentials was the last WIP section. Audited agent/backend/deploy docs via 3 parallel agents, spot-verified every positive claim against source, then fixed ~25 mismatches across 8 docs files (provision TTL 1h→30m ×3, auth/heartbeat/monitoring endpoint paths, service-name UUID claims, journalctl units, detach-marker content, MonitorServer per-metric loop → server_status-only + NodeTaskScheduler cache timers, node_config_tasks table → cache keys, FireNodeTimer dispatch → scheduler, metric coverage, VerifyNodeConfig command name, dev.js/start.js → entry.js/deploy-spa.js, frontend/.env, CI trigger, missing system-telemetry channel, schema snapshot tracked→gitignored, db→postgres, .env.production loading, S3 env keys, local storage path, Cloudinary Docker flow, prod --env-file + overlay mapping note, VITE rebuild-at-boot, MAIL_FROM_NAME, Action Board alert_* items + info severity). `npm run build --prefix docs` passes. Open code-level (not docs) gap found: compose.prod.yaml maps no APP_KEY/JWT_SECRET/MAIL_*/CLOUDINARY_* into app service — prod mail/uploads (and possibly auth/crypto) may be broken; needs a separate TODO.

## Requirements

- Only verified mismatches (doc file:line + code file:line), no speculation.

## Deferred / Skipped (known gaps)

None.

## Verification

- Placeholder sweep: done, clean (only legit input `placeholder=` attrs).
- Discrepancy checks: pending agent reports.
