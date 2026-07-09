#!/bin/bash
set -euo pipefail

APP_URL=$1

# ─── Constants ───────────────────────────────────────────────
readonly APP_DIR="/opt/monitor-agent"
readonly SERVICE_NAME="monitor-agent"
# Change upon production
readonly AGENT_URL="$APP_URL/agents/php_agent/agent.txt"
readonly AGENT_FILE="$APP_DIR/agent.php"
readonly CONFIG_FILE="$APP_DIR/config.json"
readonly SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
readonly LOG_FILE="/var/log/${SERVICE_NAME}-install.log"
readonly API_URL="$APP_URL/api/v1/agent/heartbeat"
readonly SPECS_URL="$APP_URL/api/v1/register"

# ─── Logging ─────────────────────────────────────────────────
log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  $*" | tee -a "$LOG_FILE"; }
warn() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN]  $*" | tee -a "$LOG_FILE"; }
fail() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" | tee -a "$LOG_FILE"; exit 1; }

# ─── Must run as root ─────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    fail "This script must be run as root."
fi

# ─── Argument validation ──────────────────────────────────────
if [[ "$#" -ne 3 ]]; then
    fail "Usage: $0  <app_url> <server_uuid> <api_key>"
fi

# Credentials
SERVER_UUID="$2"
API_KEY="$3"

# Validate server_id is alphanumeric
if [[ ! "$SERVER_ID" =~ ^[a-zA-Z0-9_-]+$ ]]; then
    fail "Invalid server_id. Only alphanumeric characters, hyphens, and underscores allowed."
fi

# Validate api_key length
if [[ ${#API_KEY} -lt 16 ]]; then
    fail "API key too short. Must be at least 16 characters."
fi

# ─── Check dependencies ───────────────────────────────────────
for cmd in wget php systemctl; do
    if ! command -v "$cmd" &>/dev/null; then
        fail "Required command not found: $cmd"
    fi
done

log "Starting monitor-agent installation..."

exit 1

# ─── Prepare directory ────────────────────────────────────────
mkdir -p "$APP_DIR"
chmod 750 "$APP_DIR"

# ─── Download agent ───────────────────────────────────────────
log "Downloading agent from $AGENT_URL..."

wget \
    --quiet \
    --tries=3 \
    --timeout=30 \
    --https-only \
    -O "$AGENT_FILE.tmp" \
    "$AGENT_URL" || fail "Failed to download agent."

# Basic sanity check — make sure it's a PHP file, not an error page
if ! grep -q '<?php' "$AGENT_FILE.tmp"; then
    rm -f "$AGENT_FILE.tmp"
    fail "Downloaded file does not appear to be a valid PHP file."
fi

mv "$AGENT_FILE.tmp" "$AGENT_FILE"
chmod 640 "$AGENT_FILE"
log "Agent downloaded successfully."

# ─── Write config ─────────────────────────────────────────────
log "Writing config..."

cat > "$CONFIG_FILE" << EOF
{
    "uuid": $(printf '%s' "$SERVER_UUID" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),
    "token":     $(printf '%s' "$API_KEY"   | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),
    "api_url":   $(printf '%s' "$API_URL"   | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),
    "specs_url": $(printf '%s' "$SPECS_URL"   | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'),
}
EOF

chmod 600 "$CONFIG_FILE"
log "Config written."

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
Description=PHP Monitoring Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/php ${AGENT_FILE}
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

# Give it a moment then verify it actually started
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
