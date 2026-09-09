---
status: completed
created: 2026-09-08
started: 2026-09-08
completed: 2026-09-08
adr: none
---

# Docker install docs: full install flow + virtualization + PATH edge cases

## Objective

`DocsRequirementsContent` Option B and `DocsInstallationContent` Option B currently say
"install Docker Desktop" + one `wsl --install --no-distribution` callout. That is not
enough: on Windows a fresh machine hits "need to enable virtualization", and a fresh
terminal hits `'docker' is not recognized`. Document Docker installation itself
(Windows / macOS / Linux), recheck the whole install flow, and cover edge cases
including command-not-in-PATH (`where.exe docker` / `which docker`).

## Implementation Tasks

- [x] Recheck current flow in `frontend/src/components/docs/DocsDeploymentContent.tsx`, `docs/src/components/docs/DocsDeploymentContent.tsx`, `README.md`
- [x] Expand Option B (Requirements): per-OS Docker Desktop install + WSL2/virtualization prerequisites
- [x] Expand Option B (Installation): verify-install step (`docker --version`, `where.exe`/`which`, `docker compose version`, `docker ps`) + `docker compose up --build`
- [x] Add Troubleshooting entries: virtualization/BIOS/WSL2 fix chain, `docker not recognized` PATH fix, Docker Desktop not running
- [x] Mirror the fix into both docs copies + concise README update
- [x] Verify: `tsc -b --noEmit` / eslint on touched docs files
- [x] Follow-up: document the single `bcdedit /set hypervisorlaunchtype auto` fix (conditional: Task Manager says Enabled but hypervisor missing at boot)

## Decisions

- Only one command documented for the hypervisor-off case (`bcdedit /set hypervisorlaunchtype auto`, elevated + reboot) — no competing alternatives, per user request. It does NOT replace the BIOS step.

## Requirements

- Keep existing docs conventions: `Section`/`SubSection`/`InlineCode`/`Callout`/`CodeBlock`, no Markdown, no new framework.
- `frontend/` copy is the app docs; `docs/` copy is the local-only docs site — keep them in sync.
- README stays concise; full detail lives in the docs components.
- Flow must read end-to-end: BIOS virtualization -> Windows features -> WSL2 -> Docker Desktop (WSL2 backend) -> verify `docker` on PATH -> `docker compose up --build` -> `http://localhost:8000`.

## Decisions

- None yet.

## Deferred / Skipped (known gaps)

None.

## Active Subtask

**Item:** Expand Option B docs + troubleshooting

**Status:** [•] in progress

### Working State

- Located docs: `frontend/src/components/docs/DocsDeploymentContent.tsx` and `docs/src/components/docs/DocsDeploymentContent.tsx` (mirrored), plus `README.md` §B.
- Current gap: single `wsl --install --no-distribution` callout, no BIOS/virtualization chain, no verify/PATH step, no per-OS install steps.
- Remaining: edit both `.tsx` copies + README, then verify.

### Files

- `frontend/src/components/docs/DocsDeploymentContent.tsx`
- `docs/src/components/docs/DocsDeploymentContent.tsx`
- `README.md`

### Verification

- Pending: tsc + eslint on touched files.

### Known Issues

- Must confirm whether the two `.tsx` copies are byte-identical mirrors before editing both the same way.

## Context Summary

Done 2026-09-08. Both docs copies (`frontend/` app docs + `docs/` local-only site)
now carry the full Windows chain (BIOS VT-x/AMD-V -> `wsl --install --no-distribution`
-> `wsl --update` -> Docker Desktop WSL2 engine), macOS dmg and Linux Engine steps,
a verify-install block (`docker --version`, `where.exe docker` / `which docker`,
`docker compose up --build`), and three Troubleshooting entries (virtualization,
`docker not recognized`, daemon not running). README §B mirrors the chain concisely.
Verified with `npm run build --prefix docs` and `npm run build --prefix frontend`
(both run `tsc -b` + vite, both passed; repo has no flat eslint config so eslint
was skipped). No ADR (docs-only). Hashes of the two `.tsx` copies match.

Follow-up 2026-09-08: added the single conditional `bcdedit /set hypervisorlaunchtype
auto` fix (elevated + reboot) to the virtualization Troubleshooting entry in both
copies. Documented as the one-command exception for "Task Manager says Enabled but
hypervisor missing at boot" only — it cannot fix BIOS-disabled virtualization.
Re-verified with both builds passing.

## Active Subtask

**Item:** Expand Option B docs + troubleshooting

**Status:** [x] complete
