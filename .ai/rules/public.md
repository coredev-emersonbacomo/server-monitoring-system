---
paths:
  - public/install.sh
---

# Public

## Never gate systemd presence with `systemctl list-unit-files | grep -q`
Never gate systemd presence with `systemctl list-unit-files | grep -q`. Under `set -o pipefail` it always exits 141 (grep -q closes the pipe on first match, systemctl dies on SIGPIPE) so every gated block is silently skipped — uninstall never stopped/removed monitor-agent.service; install attach-detection never fired. Use `[[ -f "$SERVICE_FILE" ]] || systemctl cat "$STABLE_UNIT" >/dev/null 2>&1`. Same trap in public/uninstall.sh.
