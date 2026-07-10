#!/usr/bin/env bash
set -euo pipefail

readonly SERVICE_NAME="monitor-agent"
readonly APP_DIR="/opt/monitor-agent"
readonly SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
readonly LOG_FILE="/var/log/${SERVICE_NAME}-uninstall.log"
readonly SERVICE_USER="monitor"

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  $*" | tee -a "$LOG_FILE"; }
warn() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN]  $*" | tee -a "$LOG_FILE"; }
fail() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" | tee -a "$LOG_FILE"; exit 1; }

if [[ $EUID -ne 0 ]]; then
    fail "This script must be run as root."
fi

log "Starting uninstallation of ${SERVICE_NAME}..."

if systemctl is-active --quiet "$SERVICE_NAME"; then
    log "Stopping service..."
    systemctl stop "$SERVICE_NAME"
else
    warn "Service was not running — skipping stop."
fi

if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
    log "Disabling service..."
    systemctl disable "$SERVICE_NAME"
else
    warn "Service was not enabled — skipping disable."
fi

if [[ -f "$SERVICE_FILE" ]]; then
    log "Removing service file..."
    rm -f "$SERVICE_FILE"
fi

log "Reloading systemd daemon..."
systemctl daemon-reload
systemctl reset-failed 2>/dev/null || true

if [[ -d "$APP_DIR" ]]; then
    log "Removing app directory: ${APP_DIR}..."
    rm -rf "$APP_DIR"
fi

if id "$SERVICE_USER" &>/dev/null; then
    log "Removing service user '${SERVICE_USER}'..."
    userdel "$SERVICE_USER"
fi

log "Uninstallation complete."
echo ""
echo "  Uninstall log : ${LOG_FILE}"
