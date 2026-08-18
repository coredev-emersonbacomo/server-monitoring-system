#!/bin/bash
set -euo pipefail

# ─── Usage ────────────────────────────────────────────────────
if [[ "$#" -lt 1 ]]; then
    echo "Usage: $0 <provision_token> [app_url]"
    exit 1
fi

TOKEN="$1"
APP_URL="${2:-http://127.0.0.1:8000}"

# Every installation gets a fresh, immutable UUID. It names the instance
# directory, the keystore identity file and the systemd instance unit, so
# multiple agents on one machine never collide.
INSTALLATION_ID=$(cat /proc/sys/kernel/random/uuid)
UNIT_NAME="monitor-agent@${INSTALLATION_ID}.service"

# ─── Constants ───────────────────────────────────────────────
readonly APP_ROOT="/opt/monitor-agent"
readonly APP_DIR="$APP_ROOT/$INSTALLATION_ID"
readonly AGENT_FILE="$APP_DIR/monitor-agent"
readonly DATA_ROOT="/var/lib/monitor-agent"
readonly INSTANCE_DIR="${DATA_ROOT}/instances/${INSTALLATION_ID}"
readonly SERVICE_FILE="/etc/systemd/system/monitor-agent@.service"
readonly LOG_FILE="/var/log/monitor-agent-install.log"
readonly PROVISION_URL="$APP_URL/api/v1/provision"
readonly SERVICE_USER="monitor"

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  $*" | tee -a "$LOG_FILE"; }
warn() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN]  $*" | tee -a "$LOG_FILE"; }
fail() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" | tee -a "$LOG_FILE"; exit 1; }

# ─── Must run as root ─────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    fail "This script must be run as root."
fi

for cmd in curl systemctl python3; do
    command -v "$cmd" &>/dev/null || fail "Required command not found: $cmd"
done

log "Starting monitor-agent installation (instance: ${INSTALLATION_ID})..."

# ─── Contact Provision Endpoint ───────────────────────────────
log "Contacting provision endpoint..."
PROVISION_RESPONSE=$(curl -fsSL -X POST \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"hostname\":\"$(hostname)\",\"platform\":\"linux\",\"architecture\":\"$(uname -m)\",\"installer_version\":\"2.0\"}" \
  "$PROVISION_URL") || fail "Failed to contact provision API or token invalid."

DOWNLOAD_URL=$(echo "$PROVISION_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("download_url", ""))')
EXPECTED_SHA256=$(echo "$PROVISION_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("expected_sha256", ""))')
SERVER_URL=$(echo "$PROVISION_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("server_url", ""))')
AGENT_VERSION=$(echo "$PROVISION_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("agent_version", "2.0"))')

if [[ -z "$DOWNLOAD_URL" ]] || [[ -z "$SERVER_URL" ]]; then
    fail "Invalid bootstrap configuration returned by server."
fi

# ─── Collision prevention ─────────────────────────────────────
if [[ -e "$INSTANCE_DIR" ]]; then
    fail "Installation directory already exists: $INSTANCE_DIR"
fi
if systemctl list-unit-files | grep -q "^${UNIT_NAME} "; then
    fail "Service unit ${UNIT_NAME} already exists — installation collision."
fi
if [[ -e "${DATA_ROOT}/identity-${INSTALLATION_ID}.pem" ]]; then
    fail "Identity key for this installation already exists — installation collision."
fi

# ─── Per-installation program folder (never shared with other agents) ──
mkdir -p "$APP_DIR"
chmod 750 "$APP_DIR"

NEED_DOWNLOAD=true
if [[ -f "$AGENT_FILE" && -n "$EXPECTED_SHA256" ]]; then
    CURRENT_SHA256=$(sha256sum "$AGENT_FILE" | awk '{print $1}')
    if [[ "$CURRENT_SHA256" == "$EXPECTED_SHA256" ]]; then
        NEED_DOWNLOAD=false
        log "Agent binary already up to date."
    fi
fi

if [[ "$NEED_DOWNLOAD" == true ]]; then
    log "Downloading agent from $DOWNLOAD_URL..."
    curl -fsSL -o "$AGENT_FILE.tmp" "$DOWNLOAD_URL" || fail "Failed to download agent."

    if [[ -n "$EXPECTED_SHA256" ]]; then
        log "Verifying checksum..."
        ACTUAL_SHA256=$(sha256sum "$AGENT_FILE.tmp" | awk '{print $1}')
        if [[ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]]; then
            rm -f "$AGENT_FILE.tmp"
            fail "Checksum verification failed! Expected $EXPECTED_SHA256, got $ACTUAL_SHA256"
        fi
        log "Checksum verified."
    fi

    mv "$AGENT_FILE.tmp" "$AGENT_FILE"
    chmod 750 "$AGENT_FILE"
    log "Agent downloaded successfully."
fi

# ─── Instance config ──────────────────────────────────────────
mkdir -p "$INSTANCE_DIR"
cat > "$INSTANCE_DIR/config.json" << EOF
{
    "server_url": "$SERVER_URL",
    "agent_version": "$AGENT_VERSION",
    "installation_id": "$INSTALLATION_ID",
    "provision_token": "$TOKEN"
}
EOF
chmod 600 "$INSTANCE_DIR/config.json"

# ─── Dedicated service user ──────────────────────────────────
if ! id "$SERVICE_USER" &>/dev/null; then
    log "Creating service user '$SERVICE_USER'..."
    useradd \
        --system \
        --no-create-home \
        --shell /usr/sbin/nologin \
        --comment "Monitor Agent Service User" \
        "$SERVICE_USER"
fi

chown -R "$SERVICE_USER":"$SERVICE_USER" "$INSTANCE_DIR"
chmod 700 "$DATA_ROOT" 2>/dev/null || true
chown -R "$SERVICE_USER":"$SERVICE_USER" "$DATA_ROOT"

# ─── systemd template unit (created once, shared by all instances) ──
if [[ ! -f "$SERVICE_FILE" ]]; then
    log "Creating systemd template unit..."
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Monitoring Agent (%i)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/opt/monitor-agent/%i/monitor-agent -instance %i
Restart=on-failure
RestartSec=5
User=${SERVICE_USER}
Group=${SERVICE_USER}

# Hardening
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=${APP_DIR} ${DATA_ROOT}
ProtectHome=yes
CapabilityBoundingSet=
AmbientCapabilities=

StandardOutput=journal
StandardError=journal
SyslogIdentifier=monitor-agent

[Install]
WantedBy=multi-user.target
EOF
    chmod 644 "$SERVICE_FILE"
fi

# ─── Enable and start ─────────────────────────────────────────
log "Enabling and starting service..."
systemctl daemon-reload
systemctl enable "$UNIT_NAME"
systemctl start  "$UNIT_NAME"

sleep 2
if systemctl is-active --quiet "$UNIT_NAME"; then
    log "Service is running."
else
    warn "Service may have failed to start. Check: journalctl -u ${UNIT_NAME}"
fi

log "Installation complete."
echo ""
echo "  To check status : systemctl status ${UNIT_NAME}"
echo "  To view logs    : journalctl -u ${UNIT_NAME} -f"
echo "  Install log     : ${LOG_FILE}"
