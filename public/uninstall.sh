#!/usr/bin/env bash
set -euo pipefail

# Usage: uninstall.sh <installation_uuid>
#
# Removes the single MonitorAgent installation identified by its immutable
# installation UUID. Under the one-agent-per-computer model there is exactly
# one agent per host, so this targets the single stable service
# (monitor-agent.service) and the single instance directory — it never
# enumerates or deletes multiple installations.

if [[ "$#" -lt 1 ]]; then
    echo "Usage: $0 <installation_uuid>   (the UUID is the only identity; no -u flag, no token)" >&2
    echo "Find the installation UUID from the server's Agent tab or:" \
         "cat /var/lib/monitor-agent/instances/*/config.json | grep installation_id" >&2
    exit 1
fi

INSTANCE="$1"

readonly DATA_ROOT="/var/lib/monitor-agent"
readonly APP_ROOT="/opt/monitor-agent"
readonly AGENT_FILE="$APP_ROOT/monitor-agent"
readonly INSTANCE_DIR="$DATA_ROOT/instances/$INSTANCE"
readonly SERVICE_FILE="/etc/systemd/system/monitor-agent.service"
readonly STABLE_UNIT="monitor-agent.service"
readonly LOG_FILE="/var/log/monitor-agent-uninstall.log"
readonly SERVICE_USER="monitor"

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  $*" | tee -a "$LOG_FILE"; }
warn() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN]  $*" | tee -a "$LOG_FILE"; }
fail() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" | tee -a "$LOG_FILE" >&2; exit 1; }

if [[ $EUID -ne 0 ]]; then
    fail "This script must be run as root."
fi

# Guard: the single instance directory must exist. There is no fallback that
# could match an agent by accident — the UUID is the identity.
if [[ ! -d "$INSTANCE_DIR" ]]; then
    fail "No MonitorAgent instance found for UUID: $INSTANCE"
fi
log "Uninstalling instance: ${INSTANCE}"

# Service presence checks must never use `systemctl list-unit-files | grep -q`:
# with `set -o pipefail`, grep -q closes the pipe on first match, systemctl is
# killed by SIGPIPE, and the gate always evaluates false.
unit_present() { [[ -f "$SERVICE_FILE" ]] || systemctl cat "$STABLE_UNIT" >/dev/null 2>&1; }

# Marker-based uninstall: write the flag into the instance directory, then
# restart the stable service. The agent (running as the service user) sees the
# marker, revokes itself on the backend, deletes its own identity key, and
# exits cleanly so the service stops.
if [[ -f "$AGENT_FILE" ]]; then
    touch "$INSTANCE_DIR/uninstall.flag"
    chown "$SERVICE_USER":"$SERVICE_USER" "$INSTANCE_DIR/uninstall.flag"
    if unit_present; then
        printf "Stopping service for cleanup"
        systemctl restart "$STABLE_UNIT" || warn "Service failed to restart for cleanup."
        for i in $(seq 1 30); do
            systemctl is-active --quiet "$STABLE_UNIT" || { printf "\rStopping service for cleanup...   \n"; break; }
            case $((i % 3)) in 0) printf "\rStopping service for cleanup.  \b\b" ;; 1) printf "\rStopping service for cleanup.. \b" ;; 2) printf "\rStopping service for cleanup..." ;; esac
            sleep 1
        done
        printf "\rStopping service for cleanup...   \n"
    fi
else
    warn "Agent binary not found - skipping marker-based cleanup."
fi

# Remove the stable service registration unconditionally — a divergent or
# orphaned unit must never keep an agent alive past uninstall.
if unit_present; then
    systemctl disable "$STABLE_UNIT" 2>/dev/null || true
    systemctl stop "$STABLE_UNIT" 2>/dev/null || true
    rm -f "$SERVICE_FILE"
    systemctl daemon-reload
    log "Removed service registration ${STABLE_UNIT}."
fi

# Last resort: an orphaned agent (deleted binary, no unit) would otherwise keep
# heartbeating and pin the server to "online" indefinitely.
if pgrep -x monitor-agent >/dev/null 2>&1; then
    pkill -x monitor-agent 2>/dev/null || true
    log "Killed lingering monitor-agent process."
fi

if [[ -d "$INSTANCE_DIR" ]]; then
    rm -rf "$INSTANCE_DIR"
    log "Removed instance directory."
fi
rmdir "$DATA_ROOT/instances" 2>/dev/null || true

# Remove the shared binary (single agent, single binary).
if [[ -d "$APP_ROOT" ]]; then
    rm -rf "$APP_ROOT"
    log "Removed program directory."
fi

log "Uninstallation complete."
echo ""
echo "  Uninstall log : ${LOG_FILE}"
