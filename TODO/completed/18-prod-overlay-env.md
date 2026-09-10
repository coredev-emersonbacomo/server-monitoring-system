---
status: completed
created: 2026-09-11
started: 2026-09-11
completed: 2026-09-11
adr: none
---

# Prod overlay drops secrets (compose.prod.yaml)

## Objective

`compose.prod.yaml` app service maps no `APP_KEY`, `JWT_SECRET`, `MAIL_*`, `CLOUDINARY_*`, `UPLOAD_STORAGE_PROVIDER` — values generated/kept in `.env.docker` never reach the container. Queued mail/storage-delete jobs (queue service) also lack `MAIL_*`/`CLOUDINARY_*`.

## Tasks

- [x] Map required + optional secrets into app service (fail-fast `:?` for APP_KEY/JWT_SECRET)
- [x] Map MAIL_*/CLOUDINARY_*/UPLOAD_STORAGE_PROVIDER into queue service (executes the jobs)
- [x] Ensure `.env.docker.example` documents every mapped key
- [x] Pest regression test: parse overlay YAML, assert keys present
- [x] Update docs Production note written for the gap

## Context Summary

`compose.prod.yaml` app service gained APP_NAME/APP_KEY:?/JWT_SECRET:?/UPLOAD_STORAGE_PROVIDER/MAIL_*/CLOUDINARY_*; queue gained the mail/storage subset (no APP_KEY/JWT — jobs neither decrypt nor validate tokens; verified no encrypted casts in app/). `.env.docker.example` gained APP_NAME, mail transport vars, UPLOAD_STORAGE_PROVIDER. New `tests/Feature/ProdOverlayEnvTest.php` (3 tests: app keys, queue keys, every referenced ${VAR} documented in example — the last caught undocumented keys by design). `docker compose config` validates with filled env and fail-fasts on blanks as intended. Docs Production note updated to the fixed reality. Pint clean, docs build passes.

## Verification

- `php artisan test --compact --filter=ProdOverlayEnvTest`: 3 passed, 44 assertions
- `docker compose ... config --quiet`: exit True (valid); `--env-file .env.docker.example` correctly refuses on blank required vars
- `npm run build --prefix docs`: built in 1.33s
