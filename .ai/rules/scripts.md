---
paths:
  - 'scripts/ngrok*.js'
---

# Scripts

## Auto-rebuild stale docker images via hash file
Never run plain `docker compose up -d` in ngrok.js/ngrok-build.js: route it through scripts/docker-build-state.js (isDockerStale/markDockerFresh) so dependency changes (Dockerfile, lockfiles, compose.yaml) trigger --build automatically. Plain up never rebuilds stale images; compose itself already recreates containers on config/env drift. Base-image digest bumps are invisible to the hash — use the `rebuild` arg to force.
