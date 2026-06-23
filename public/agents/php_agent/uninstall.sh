#!/usr/bin/env bash
set -euo pipefail

readonly SERVICE_NAME="monitor-agent"
readonly APP_DIR="/opt/monitor-agent"
readonly SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
readonly LOG_FILE="/var/log/${SERVICE_NAME}-uninstall.log"
readonly SERVICE_USER="monitor"

# ── Logging ───────────────────────────────────────────────────
log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  $*" | tee -a "$LOG_FILE"; }
warn() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN]  $*" | tee -a "$LOG_FILE"; }
fail() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" | tee -a "$LOG_FILE"; exit 1; }

# ── Must run as root ──────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    fail "This script must be run as root."
fi

log "Starting uninstallation of ${SERVICE_NAME}..."

# ── Stop service if running ───────────────────────────────────
if systemctl is-active --quiet "$SERVICE_NAME"; then
    log "Stopping service..."
    systemctl stop "$SERVICE_NAME"
else
    warn "Service was not running — skipping stop."
fi

# ── Disable service if enabled ────────────────────────────────
if systemctl is-enabled --quiet "$SERVICE_NAME" 2>/dev/null; then
    log "Disabling service..."
    systemctl disable "$SERVICE_NAME"
else
    warn "Service was not enabled — skipping disable."
fi

# ── Remove service file ───────────────────────────────────────
if [[ -f "$SERVICE_FILE" ]]; then
    log "Removing service file..."
    rm -f "$SERVICE_FILE"
else
    warn "Service file not found — skipping."
fi

# ── Reload systemd ────────────────────────────────────────────
log "Reloading systemd daemon..."
systemctl daemon-reload
systemctl reset-failed 2>/dev/null || true

# ── Remove app directory ──────────────────────────────────────
if [[ -d "$APP_DIR" ]]; then
    log "Removing app directory: ${APP_DIR}..."
    rm -rf "$APP_DIR"
else
    warn "App directory not found — skipping."
fi

# ── Remove service user ───────────────────────────────────────
if id "$SERVICE_USER" &>/dev/null; then
    log "Removing service user '${SERVICE_USER}'..."
    userdel "$SERVICE_USER"
else
    warn "Service user '${SERVICE_USER}' not found — skipping."
fi

# ── Verify everything is gone ─────────────────────────────────
LEFTOVERS=0

if systemctl list-units --all | grep -q "$SERVICE_NAME"; then
    warn "Service still visible in systemd."
    LEFTOVERS=1
fi

if [[ -f "$SERVICE_FILE" ]]; then
    warn "Service file still exists: $SERVICE_FILE"
    LEFTOVERS=1
fi

if [[ -d "$APP_DIR" ]]; then
    warn "App directory still exists: $APP_DIR"
    LEFTOVERS=1
fi

if [[ $LEFTOVERS -eq 1 ]]; then
    warn "Uninstallation completed with warnings. Some leftovers may remain."
else
    log "Uninstallation complete. All components removed successfully."
fi

echo ""
echo "  Uninstall log : ${LOG_FILE}"
