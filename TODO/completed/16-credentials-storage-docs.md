---
status: completed
created: 2026-09-10
started: 2026-09-10
completed: 2026-09-10
adr: none
---

# Complete Credentials-Storage Docs (DocsCredentialsContent)

## Objective

Replace the "Under construction" placeholder in `DocsCredentialsContent` (`docs/src/components/docs/DocsTechnicalContent.tsx`) with complete documentation of the actual credential lifecycle, verified against source. No design is "being updated" — the placeholder was stale.

Note: the old `frontend/` embedded docs viewer was deleted (docs consolidated into the standalone `docs/` site), so there is no byte-parity requirement anymore — single file only.

## Implementation Tasks

- [x] Rewrite `DocsCredentialsContent`: env layers, user passwords, sessions/tokens, password reset, agent identity/auth, provision tokens, hashed-vs-short-lived matrix, rotation
- [x] Verify `docs` workspace builds

## Context Summary

Replaced the stale "Under construction" placeholder in `DocsCredentialsContent` (`docs/src/components/docs/DocsTechnicalContent.tsx` only — the `frontend/` embedded viewer was deleted during docs consolidation, so no parity work). New sections, all verified against source: immutable env layers (OS env > `.env` > `.env.development`, `bootstrap/app.php`), bcrypt passwords, HS256 access JWT + sid revocation check, ULID/256-bit refresh secrets stored as SHA-256 with 30s rotation grace, SHA-256 reset code/token TTLs, per-installation RSA agent keys (Windows CNG / Linux 0600), 60s single-use challenges, memory-only 15-min agent JWTs, single-use 30-min provision tokens, hashed-vs-short-lived matrix, rotation guide. "Production secrets (.env.docker)" section untouched. `npm run build --prefix docs` (tsc + vite) passes.

## Requirements

- Every claim traceable to source (`bootstrap/app.php`, `config/jwt.php`, `config/agent.php`, `User`/`UserSession`/`ProvisionToken` models, `JwtService`, `SessionManager`, `RefreshTokenRotationService`, `PasswordResetController`, `JwtAuthController`, `AgentAuthService`, `ProvisioningService`, Go `keystore*.go`).
- Keep the existing "Production secrets (.env.docker)" section untouched.
- Match existing docs style (`Section`, `InlineCode`, `Callout`, tables).

## Deferred / Skipped (known gaps)

None.

## Verification

- `npm run build --prefix docs` (tsc -b + vite build): passing, 1.55s
