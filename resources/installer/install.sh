#!/bin/bash
set -euo pipefail

# ─── Usage ────────────────────────────────────────────────────
if [[ "$#" -lt 1 ]]; then
    echo "Usage: $0 <provision_token> [app_url]"
    echo ""
    echo "  provision_token   Token from the monitoring server"
    echo "  app_url           Server URL (default: http://127.0.0.1:8000)"
    exit 1
fi

TOKEN="$1"
APP_URL="${2:-http://127.0.0.1:8000}"

# ─── Constants ───────────────────────────────────────────────
readonly APP_DIR="/opt/monitor-agent"
readonly SERVICE_NAME="monitor-agent"
readonly AGENT_FILE="$APP_DIR/agent"
readonly BOOTSTRAP_FILE="$APP_DIR/bootstrap.json"
readonly SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
readonly LOG_FILE="/var/log/${SERVICE_NAME}-install.log"
readonly PROVISION_URL="$APP_URL/api/v1/provision"

# ─── Logging ─────────────────────────────────────────────────
log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  $*" | tee -a "$LOG_FILE"; }
warn() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN]  $*" | tee -a "$LOG_FILE"; }
fail() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" | tee -a "$LOG_FILE"; exit 1; }

# ─── Must run as root ─────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    fail "This script must be run as root."
fi

# ─── Check dependencies ───────────────────────────────────────
for cmd in curl systemctl; do
    if ! command -v "$cmd" &>/dev/null; then
        fail "Required command not found: $cmd"
    fi
done

log "Starting monitor-agent installation..."

# ─── Contact Provision Endpoint ───────────────────────────────
log "Contacting provision endpoint..."
PROVISION_RESPONSE=$(curl -fsSL -X POST \
  -H "Content-Type: application/json" \
  -d "{\"token\":\"$TOKEN\",\"hostname\":\"$(hostname)\",\"platform\":\"linux\",\"architecture\":\"$(uname -m)\",\"installer_version\":\"2.0\"}" \
  "$PROVISION_URL") || fail "Failed to contact provision API or token invalid."

DOWNLOAD_URL=$(echo "$PROVISION_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("download_url", ""))')
EXPECTED_SHA256=$(echo "$PROVISION_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("expected_sha256", ""))')
API_URL=$(echo "$PROVISION_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("api_url", ""))')
REGISTER_URL=$(echo "$PROVISION_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("register_url", ""))')
HEARTBEAT_INTERVAL=$(echo "$PROVISION_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("heartbeat_interval", "5"))')
AGENT_VERSION=$(echo "$PROVISION_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("agent_version", "2.0"))')

if [[ -z "$DOWNLOAD_URL" ]] || [[ -z "$API_URL" ]]; then
    fail "Invalid bootstrap configuration returned by server."
fi

# ─── Prepare directory ────────────────────────────────────────
mkdir -p "$APP_DIR"
chmod 750 "$APP_DIR"

# ─── Download agent ───────────────────────────────────────────
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

# ─── Write bootstrap config ───────────────────────────────────
log "Writing bootstrap configuration..."
cat > "$BOOTSTRAP_FILE" << EOF
{
    "token": "$TOKEN",
    "api_url": "$API_URL",
    "register_url": "$REGISTER_URL",
    "heartbeat_interval": $HEARTBEAT_INTERVAL,
    "hostname": "$(hostname)",
    "agent_version": "$AGENT_VERSION"
}
EOF
chmod 600 "$BOOTSTRAP_FILE"

# ─── Create dedicated service user ───────────────────────────
if ! id "monitor" &>/dev/null; then
    log "Creating service user 'monitor'..."
    useradd \
        --system \
        --no-create-home \
        --shell /usr/sbin/nologin \
        --comment "Monitor Agent Service User" \
        monitor
fi

chown -R monitor:monitor "$APP_DIR"

# ─── Create systemd service ───────────────────────────────────
log "Creating systemd service..."
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Monitoring Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=${AGENT_FILE}
WorkingDirectory=${APP_DIR}
Restart=on-failure
RestartSec=5
User=monitor
Group=monitor

# Hardening
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=${APP_DIR}
ProtectHome=yes
CapabilityBoundingSet=
AmbientCapabilities=

StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOF

chmod 644 "$SERVICE_FILE"

# ─── Enable and start ─────────────────────────────────────────
log "Enabling and starting service..."
systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl start  "$SERVICE_NAME"

sleep 2
if systemctl is-active --quiet "$SERVICE_NAME"; then
    log "Service is running."
else
    warn "Service may have failed to start. Check: journalctl -u ${SERVICE_NAME}"
fi

log "Installation complete."
echo ""
echo "  To check status : systemctl status ${SERVICE_NAME}"
echo "  To view logs    : journalctl -u ${SERVICE_NAME} -f"
echo "  Install log     : ${LOG_FILE}"
