#!/usr/bin/env bash
set -euo pipefail

# Usage: detach.sh <installation_uuid> <server_uuid>
#
# Detaches a single server from the single MonitorAgent installation.
# The agent remains installed and keeps monitoring its other servers.

if [[ "$#" -lt 2 ]]; then
    echo "Usage: $0 <installation_uuid> <server_uuid>" >&2
    exit 1
fi

INSTANCE="$1"
SERVER="$2"

readonly DATA_ROOT="/var/lib/monitor-agent"
readonly APP_ROOT="/opt/monitor-agent"
readonly AGENT_FILE="$APP_ROOT/monitor-agent"
readonly INSTANCE_DIR="$DATA_ROOT/instances/$INSTANCE"
readonly LOG_FILE="/var/log/monitor-agent-detach.log"

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  $*" | tee -a "$LOG_FILE"; }
fail() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" | tee -a "$LOG_FILE" >&2; exit 1; }
# Go binary animates its own ellipsis for detach; shell just passes through so dots appear inline.

if [[ $EUID -ne 0 ]]; then
    fail "This script must be run as root."
fi

if [[ ! -d "$INSTANCE_DIR" ]]; then
    fail "No MonitorAgent instance found for UUID: $INSTANCE"
fi

log "Detaching server $SERVER from instance $INSTANCE"

if [[ -f "$AGENT_FILE" ]]; then
    "$AGENT_FILE" -detach -instance "$INSTANCE" -server "$SERVER"
    log "Detach request sent - server detached immediately (or on next heartbeat if offline)."
else
    fail "Agent binary not found at $AGENT_FILE"
fi

log "Detach complete for server $SERVER - agent remains."
