#!/usr/bin/env bash
set -euo pipefail

# Usage: uninstall.sh [instance_uuid]
# With no argument, every monitor-agent instance on this host is uninstalled.

INSTANCE="${1:-}"

readonly DATA_ROOT="/var/lib/monitor-agent"
readonly APP_ROOT="/opt/monitor-agent"
readonly LOG_FILE="/var/log/monitor-agent-uninstall.log"
readonly SERVICE_USER="monitor"

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  $*" | tee -a "$LOG_FILE"; }
warn() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN]  $*" | tee -a "$LOG_FILE"; }

if [[ $EUID -ne 0 ]]; then
    echo "This script must be run as root." >&2
    exit 1
fi

# Discover instances: the one named explicitly, or every instance on this host.
INSTANCES=()
if [[ -n "$INSTANCE" ]]; then
    INSTANCES=("$INSTANCE")
elif [[ -d "$DATA_ROOT/instances" ]]; then
    for dir in "$DATA_ROOT"/instances/*; do
        [[ -d "$dir" ]] && INSTANCES+=("$(basename "$dir")")
    done
fi

if [[ ${#INSTANCES[@]} -eq 0 ]]; then
    log "No monitor-agent instances found. Nothing to uninstall."
    exit 0
fi

for INSTALLATION_ID in "${INSTANCES[@]}"; do
    log "Uninstalling instance: ${INSTALLATION_ID}"
    INSTANCE_DIR="$DATA_ROOT/instances/$INSTALLATION_ID"
    UNIT="monitor-agent@${INSTALLATION_ID}.service"
    AGENT_FILE="$APP_ROOT/$INSTALLATION_ID/monitor-agent"

    if [[ -f "$AGENT_FILE" ]]; then
        # Marker-based uninstall: write the flag, restart the unit, and the
        # agent (running as the monitor user) revokes itself on the backend,
        # deletes its own identity key file, then exits cleanly.
        mkdir -p "$INSTANCE_DIR"
        touch "$INSTANCE_DIR/uninstall.flag"
        if systemctl list-unit-files | grep -q "^${UNIT} "; then
            systemctl restart "$UNIT" || warn "Unit failed to restart for cleanup."
            # Wait for the agent to process the marker and exit.
            for _ in $(seq 1 30); do
                systemctl is-active --quiet "$UNIT" || break
                sleep 1
            done
        fi
    else
        warn "Agent binary not found - skipping marker-based cleanup."
    fi

    if systemctl list-unit-files | grep -q "^${UNIT} "; then
        systemctl disable "$UNIT" 2>/dev/null || true
        systemctl stop "$UNIT" 2>/dev/null || true
        rm -f "/etc/systemd/system/${UNIT}"
    fi
    systemctl daemon-reload

    if [[ -d "$INSTANCE_DIR" ]]; then
        rm -rf "$INSTANCE_DIR"
        log "Removed instance directory."
    fi
    rmdir "$DATA_ROOT/instances" 2>/dev/null || true

    if [[ -d "$APP_ROOT/$INSTALLATION_ID" ]]; then
        rm -rf "$APP_ROOT/$INSTALLATION_ID"
        log "Removed program directory."
    fi
done

log "Uninstallation complete."
echo ""
echo "  Uninstall log : ${LOG_FILE}"
