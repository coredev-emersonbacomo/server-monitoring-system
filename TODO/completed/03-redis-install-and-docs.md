---
status: completed
created: 2026-08-20
completed: 2026-08-20
---

# Redis Windows Extraction, Installation Docs, and Cross-Platform Install Commands

## Objective

1. Download the Redis 8.8.0 Windows ZIP (non-Service build) from `https://github.com/redis-windows/redis-windows/releases/download/8.8.0/Redis-8.8.0-Windows-x64-msys2.zip` and extract it to `C:\redis\`, then verify `C:\redis\redis-server.exe` exists.
2. Document Redis installation and setup in the project docs (README Prerequisites + the in-app docs page).
3. Provide command-line install options for both Windows and Linux (npm scripts / standalone scripts).

## Implementation Tasks

- [x] Download Redis Windows ZIP to a temp location
- [x] Extract to `C:\redis\`
- [x] Verify `C:\redis\redis-server.exe` exists and runs
- [x] Add Redis installation/setup documentation to README + in-app docs
- [x] Create Windows install command/script (`scripts/install-redis.ps1`)
- [x] Create Linux install command/script (`scripts/install-redis.sh`)
- [x] Verify everything

## Requirements

### Existing context
- `README.md` Prerequisites already mentioned Redis: dev auto-starts Redis from PATH, falling back to `C:\redis\redis-server.exe`.
- `scripts/dev.js` line 40: `{ command: 'redis-server || C:\\redis\\redis-server.exe', ... }` — tries PATH first, falls back to the canonical Windows path.
- `.env.development` has `REDIS_HOST=127.0.0.1`, `REDIS_PORT=6379`, `REDIS_CLIENT=predis`.

### Install commands
- **Windows**: download the ZIP from the redis-windows/releases URL and extract to `C:\redis\`, verify `redis-server.exe`.
- **Linux**: install Redis via the system package manager (`apt`/`dnf`/`yum`/`pacman`) or build from source, with equivalent verification.
- Both invokable as npm scripts (`install-redis:windows`, `install-redis:linux`) and as standalone scripts in `scripts/`.

## Decisions
- Docs live in the in-app docs page (`DocsDeploymentContent.tsx` → "Installation & Setup"), not a standalone markdown file, to avoid duplication with the existing docs architecture. README Prerequisites links the npm scripts and notes the canonical `C:\redis\` path.
- Two npm scripts backed by standalone, reusable scripts in `scripts/` so the same logic works without the npm wrapper.

## Discovered Requirements / Deferrals
- **PowerShell gotcha**: `Test-Path (subexpr) -and ...` makes PowerShell 5.1 try to bind `-and` as a parameter named "and" of `Test-Path` (not the boolean operator), causing `ParameterBindingException`. Fixed by wrapping: `((Test-Path ...)) -and (-not $Force)`. Other `Test-Path` calls already used the safe `-not (Test-Path ...)` form. No ADR — tooling-only note.
- Linux script (`scripts/install-redis.sh`) could not be runtime-verified on this Windows machine (no bash on PATH); syntax reviewed by hand. Defer: run on a Linux host as a check.

## Verification

- `Test-Path C:\redis\redis-server.exe` → True; `redis-server.exe --version` runs (Redis v=8.4.4 in the 8.8.0 redis-windows build).
- `npm run install-redis:windows` → exit 0 ("redis-server.exe already exists at C:\redis. Use -Force to reinstall.").
- `npm run install-redis:linux` registered (verified via package.json scripts).
- Frontend: `npx tsc --noEmit` clean; `npx eslint src/components/docs/DocsDeploymentContent.tsx` clean.
- In-app docs page has a new "Redis" section (npm commands, manual Windows download/extract/verify, Linux package-manager/source-build + daemon start).

## Context Summary

Redis 8.8.0 Windows non-Service ZIP downloaded and extracted to `C:\redis\`; `C:\redis\redis-server.exe` verified present and runnable. Added cross-platform install scripts (`scripts/install-redis.ps1`, `scripts/install-redis.sh`), the latter using apt/dnf/yum/pacman with a source-build fallback and a `--user` option, wired as `npm run install-redis:windows` and `npm run install-redis:linux` in the root `package.json`. Added a Redis installation/setup section to the in-app docs (`DocsDeploymentContent.tsx`) covering npm commands, manual Windows steps, and Linux install + daemon start; updated the README prerequisite line. Fixed a PowerShell 5.1 parse pitfall (`-and` bound as a `Test-Path` parameter) by wrapping the `Test-Path` subexpression. No ADR — docs and tooling only. The active `TODO/active/` files `01-*` and `02-*` belong to a separate prior task stream (not touched here).
