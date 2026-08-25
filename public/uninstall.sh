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

# Marker-based uninstall: write the flag into the instance directory, then
# restart the stable service. The agent (running as the service user) sees the
# marker, revokes itself on the backend, deletes its own identity key, and
# exits cleanly so the service stops.
if [[ -f "$AGENT_FILE" ]]; then
    touch "$INSTANCE_DIR/uninstall.flag"
    chown "$SERVICE_USER":"$SERVICE_USER" "$INSTANCE_DIR/uninstall.flag"
    if systemctl list-unit-files | grep -q "^${STABLE_UNIT} "; then
        systemctl restart "$STABLE_UNIT" || warn "Service failed to restart for cleanup."
        for _ in $(seq 1 30); do
            systemctl is-active --quiet "$STABLE_UNIT" || break
            sleep 1
        done
    fi
else
    warn "Agent binary not found - skipping marker-based cleanup."
fi

# Remove the stable service registration (created once by the installer).
if systemctl list-unit-files | grep -q "^${STABLE_UNIT} "; then
    systemctl disable "$STABLE_UNIT" 2>/dev/null || true
    systemctl stop "$STABLE_UNIT" 2>/dev/null || true
    rm -f "$SERVICE_FILE"
    systemctl daemon-reload
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
