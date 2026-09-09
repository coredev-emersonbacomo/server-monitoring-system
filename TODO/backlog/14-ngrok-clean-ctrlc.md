---
status: planned
created: 2026-09-08
---

# ngrok Ctrl+C kills the shell (exit 2) — match iYu's working stop pattern

## Objective

`npm run ngrok` + Ctrl+C terminates `powershell.exe` itself (VS Code: "terminal
process terminated with exit code: 2") instead of running cleanup and returning
to a prompt. The iYu project (`C:\Users\User\Downloads\iYu`, `pnpm dev`) also
runs Docker and stops cleanly on Ctrl+C — read its stop plumbing and mirror the
working pattern in `scripts/ngrok.js`.

## Implementation Tasks

- [x] Read iYu `dev` script + compose/stop handling; diff Ctrl+C plumbing vs ngrok.js
- [x] Fix ngrok.js Ctrl+C path — removed `shell: true` from `spawnSync("docker", ["compose", "stop"], ...)` in `cleanup()` (line ~256). `cmd.exe` intermediary was intercepting SIGINT during the blocking stop and killing the parent PowerShell terminal. iYu uses direct spawn (no shell) — now matches.
- [ ] Verify: `node --check` passes; interactive Ctrl+C must be verified by user run
  [2026-09-09: `node --check` clean on ngrok.js + ngrok-build.js. Interactive
  Ctrl+C still needs a live run.]

## Requirements

- Ctrl+C must run cleanup (tunnel + Vite down, stack parked stopped, Herd `.env` restored) AND return to a live shell prompt — never terminate powershell.exe.
- Keep single-instance guard, owned-image kill guard, completion marker behavior.

## Decisions

- **Root cause**: `shell: true` on the `spawnSync("docker", ["compose", "stop"], ...)` inside `cleanup()` wrapped the command in `cmd.exe`. On Windows, SIGINT during that blocking call caused `cmd.exe` to terminate the parent PowerShell shell (exit 2). Removing `shell: true` makes docker a direct child process (matching iYu `dev.mjs`), so Ctrl+C stops the stack and returns to a prompt.
- `ngrok-build.js` has the same `shell: true` pattern but its SIGINT handler doesn't call `docker compose stop` (stack stays up by design), so it's unaffected.

## Deferred / Skipped (known gaps)

None.

## Context Summary

Created 2026-09-08 from user report + pointer to iYu reference. Prior tasks in
this stream: `TODO/completed/12-docker-install-docs.md`,
`TODO/completed/13-ngrok-memory-env.md`.
