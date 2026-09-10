---
status: active
created: 2026-09-10
---

# Public repo secrets sweep

## Objective
Make the repo safe to make public: no real credentials in tracked files or git history, and docs warning that `.env.development` values are public dummy defaults.

## Implementation Tasks
- [x] Audit `git log -p` + `git grep` for credentials/API keys
- [ ] Sanitize tracked files holding real secrets (`phpunit.xml` Cloudinary)
- [ ] Document public-keys warning (`.env.development` header, docs site, README)
- [ ] Verify with tests; hand over history-purge + rotation commands (destructive, needs owner)

## Requirements
- Current tree: `.env.development` already sanitized (commit 24b70fc); SMTP/Cloudinary/Discord empty, JWT/Reverb/APP_KEY dummy.
- Live leak in tree: `phpunit.xml` ships real `CLOUDINARY_*` (name/key/secret). Tests override with `test-cloud`/`test-key`/`test-secret` in code, so placeholders are safe.
- Non-issue: `UserFactory` image URLs contain the Cloudinary *cloud name* only (public delivery identifier, also served to browsers) — leaving as-is.
- History still leaks (pre-24b70fc `.env.development`): Discord bot token + channel/role IDs, Cloudinary name/key/secret, JWT secret, APP_KEY, Reverb secret. Purging rewrites history → do NOT do silently; owner runs filter-repo + force-push, then rotates every secret.

## Decisions
- phpunit.xml placeholders match the in-test overrides (`test-cloud`, `test-key`, `test-secret`) so no test depends on real values.
- Docs edit only in `docs/src/.../DocsDeploymentContent.tsx`; `frontend/src/.../docs` mirror no longer exists on disk (staged deletions), so no byte-parity copy needed.
- No history rewrite in this session: working tree is dirty and purge invalidates clones — owner decision.

## Deferred / Skipped (known gaps)
- [ ] Run `git filter-repo` history purge + `git push --force` — owner-only, after committing this sweep. Revisit trigger: before flipping repo to public.
- [ ] Rotate Discord bot token, Cloudinary keys, JWT secret, APP_KEY, Reverb credentials — revisit trigger: immediately after purge/before public.

## Verification
- `UploadIntentTest`: 22/22 passed (phpunit.xml placeholders safe).
- `ProdOverlayEnvTest`: 3/3 passed.
- `tsc --noEmit` in `docs/`: clean.
- `git grep` for all 6 known secret values across tracked tree: zero hits.
- No PHP files changed → pint not applicable.

## Context Summary
Audit done: tree leak = phpunit.xml Cloudinary; history leak = pre-24b70fc .env.development secrets. Implementing sanitize + docs next.

PAUSED 2026-09-10: working-tree cleanup DONE and verified (see Verification).
ON HOLD until owner pushes + gives go-ahead: git history purge (filter-repo)
and any history file removals. Then rotate all compromised secrets.
