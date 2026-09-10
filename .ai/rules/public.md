---
paths:
  - public/install.sh
  - 'public/*.ps1'
  - 'public/install.*'
---

# Public

## Never gate systemd presence with `systemctl list-unit-files | grep -q`
Never gate systemd presence with `systemctl list-unit-files | grep -q`. Under `set -o pipefail` it always exits 141 (grep -q closes the pipe on first match, systemctl dies on SIGPIPE) so every gated block is silently skipped — uninstall never stopped/removed monitor-agent.service; install attach-detection never fired. Use `[[ -f "$SERVICE_FILE" ]] || systemctl cat "$STABLE_UNIT" >/dev/null 2>&1`. Same trap in public/uninstall.sh.

## sc.exe delete is async — wait for disappearance
sc.exe delete only marks a Windows service for deletion; SCM finalizes it once all handles close (Services MMC, Task Manager, lingering exe). After every sc delete, poll Get-Service until it disappears (bounded ~30s) and warn when it pins. Before CreateService on reinstall, pre-clean stale registrations or CreateService fails with 1072 marked-for-deletion.

## Send ngrok-skip header on all in-script HTTP calls
Every in-script HTTP call (provision POST, binary download) must send header ngrok-skip-browser-warning: true. PowerShell's browser-like UA makes free-tier ngrok intermittently answer 200 with its interstitial HTML instead of JSON, which surfaces as empty fields (e.g. missing server_url). Unconditional header is safe: non-ngrok servers ignore it. Go agent is exempt (Go-http-client UA passes through).

## Conditional ngrok header via serve-time placeholder
The ngrok-skip-browser-warning header is conditional, baked at serve time: scripts contain a {{NGROK_SKIP_BROWSER_WARNING}} placeholder the controller replaces with true/false from that env var (FILTER_VALIDATE_BOOLEAN). Raw files default to no header. Never hardcode the header on: prod must not send it. ngrok edge can also flatten API error statuses to 200, so both scripts surface a message-only rejection body instead of only checking server_url.
