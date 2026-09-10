#!/bin/bash
set -euo pipefail

# ─── Usage ────────────────────────────────────────────────────
if [[ "$#" -lt 1 ]]; then
    echo "Usage: $0 <provision_token> [app_url]"
    exit 1
fi

TOKEN="$1"
ARG2="${2:-}"
ARG3="${3:-}"

if [[ "$ARG2" =~ ^https?:// ]]; then
    APP_URL="$ARG2"
    EXPLICIT_INSTALLATION_ID=""
else
    EXPLICIT_INSTALLATION_ID="$ARG2"
    APP_URL="${ARG3:-{{APP_URL}}}"
fi

# ─── Constants ───────────────────────────────────────────────
readonly APP_ROOT="/opt/monitor-agent"            # shared binary location
readonly AGENT_FILE="$APP_ROOT/monitor-agent"
readonly DATA_ROOT="/var/lib/monitor-agent"       # shared state root
readonly SERVICE_FILE="/etc/systemd/system/monitor-agent.service"
readonly STABLE_UNIT="monitor-agent.service"
readonly LOG_FILE="/var/log/monitor-agent-install.log"
readonly SERVICE_USER="monitor"
readonly PROVISION_URL="$APP_URL/api/v1/provision"

# Tunnel bypass header for the curl calls below (provision POST, binary
# download). The server replaces {{NGROK_SKIP_BROWSER_WARNING}} with
# "true"/"false" when serving this script; PowerShell-style browser UAs get
# ngrok's interstitial HTML, and error statuses can arrive flattened to 200,
# so every HTTP call carries the header and every rejection is surfaced.
# Raw file (unreplaced) sends no header and stays valid syntax.
NGROK_CURL_ARGS=()
if [[ "{{NGROK_SKIP_BROWSER_WARNING}}" == "true" ]]; then
    NGROK_CURL_ARGS=(-H "ngrok-skip-browser-warning: true")
fi

log()  { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  $*" | tee -a "$LOG_FILE"; }
warn() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [WARN]  $*" | tee -a "$LOG_FILE"; }
fail() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] [ERROR] $*" | tee -a "$LOG_FILE" >&2; exit 1; }
# animate ellipsis while long commands run — \r cycle 1..3 dots, cursor follows last dot (pad+backs)
animate_while_pid() { local msg="$1" pid="$2" i=0; while kill -0 "$pid" 2>/dev/null; do case $((i%3)) in 0) printf "\r%s.  \b\b" "$msg";;1) printf "\r%s.. \b" "$msg";;2) printf "\r%s..." "$msg";;esac; sleep 0.4; i=$((i+1)); done; printf "\r%s...   \n" "$msg"; }

# ─── Must run as root ─────────────────────────────────────────
if [[ $EUID -ne 0 ]]; then
    fail "This script must be run as root."
fi

for cmd in curl systemctl python3 sha256sum useradd; do
    command -v "$cmd" &>/dev/null || fail "Required command not found: $cmd"
done

# ─── Detect an existing single agent installation ───────────
ATTACH=0
INSTALLATION_ID=""

if [[ -n "$EXPLICIT_INSTALLATION_ID" ]]; then
    INSTALLATION_ID="$EXPLICIT_INSTALLATION_ID"
    log "Using specified installation UUID (${INSTALLATION_ID}) for installation/reinstallation."
    ATTACH=0
elif [[ -f "$SERVICE_FILE" ]] || systemctl cat "$STABLE_UNIT" >/dev/null 2>&1; then
    # The stable service already exists on this host: reuse its installation UUID,
    # parsed from the service's ExecStart ("-instance <uuid>") using bash
    # parameter expansion so there is no grep|head pipeline under pipefail.
    EXEC_START=$(systemctl cat "$STABLE_UNIT" 2>/dev/null | grep '^ExecStart=' || true)

    if [[ -n "$EXEC_START" ]]; then
        TAIL="${EXEC_START##*-instance }"
        INSTALLATION_ID="${TAIL%% *}"
    fi

    if [[ -z "$INSTALLATION_ID" ]] && [[ -d "${DATA_ROOT}/instances" ]]; then
        INSTANCES=($(find "${DATA_ROOT}/instances" -mindepth 1 -maxdepth 1 -type d -exec basename {} \; 2>/dev/null || true))
        if [[ ${#INSTANCES[@]} -eq 1 ]]; then
            INSTALLATION_ID="${INSTANCES[0]}"
            log "Recovered installation UUID (${INSTALLATION_ID}) from instance directory."
        fi
    fi

    if [[ -n "$INSTALLATION_ID" ]]; then
        # Legacy sanity check: warn (but do not block) if old per-instance template
        # units are still present — those require an explicit operator consolidation
        # (see ADR-0002 migration note) and are out of scope for a fresh attach.
        # Glob-filtered list-unit-files (no grep|q pipe → no pipefail SIGPIPE).
        if [[ -n "$(systemctl list-unit-files --no-legend 'monitor-agent@*' 2>/dev/null || true)" ]]; then
            warn "Legacy per-instance units (monitor-agent@*) are present alongside the stable service."
            warn "Consolidate them manually before relying on the single-agent model."
        fi

        log "Detected existing MonitorAgent service (installation: ${INSTALLATION_ID}) — attaching new server."
        ATTACH=1
    else
        warn "Stable service ${STABLE_UNIT} exists without a valid installation UUID in ExecStart or instance directory. Re-registering service as a new installation."
        INSTALLATION_ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || tr -dc 'a-f0-9' < /dev/urandom | head -c 32)
        ATTACH=0
    fi
else
    INSTALLATION_ID=$(cat /proc/sys/kernel/random/uuid 2>/dev/null || tr -dc 'a-f0-9' < /dev/urandom | head -c 32)
    log "No existing service found — creating new single-agent installation (instance: ${INSTALLATION_ID})."
fi

INSTANCE_DIR="${DATA_ROOT}/instances/${INSTALLATION_ID}"

# ─── Contact Provision Endpoint ───────────────────────────────
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  Contacting provision endpoint..." | tee -a "$LOG_FILE" >/dev/null
printf "Contacting provision endpoint"
PROVISION_TMP=$(mktemp)
( curl -fsSL "${NGROK_CURL_ARGS[@]}" -X POST -H "Content-Type: application/json" -d "{\"token\":\"$TOKEN\",\"hostname\":\"$(hostname)\",\"platform\":\"linux\",\"architecture\":\"$(uname -m)\",\"installer_version\":\"3.0\"}" "$PROVISION_URL" > "$PROVISION_TMP" 2>/dev/null ) &
curl_pid=$!
animate_while_pid "Contacting provision endpoint" $curl_pid
wait $curl_pid || fail "Failed to contact provision API or token invalid."
PROVISION_RESPONSE=$(cat "$PROVISION_TMP"); rm -f "$PROVISION_TMP"
printf "\rContacting provision endpoint...   \n"

DOWNLOAD_URL=$(echo "$PROVISION_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("download_url", ""))')
EXPECTED_SHA256=$(echo "$PROVISION_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("expected_sha256", ""))')
SERVER_URL=$(echo "$PROVISION_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("server_url", ""))')
AGENT_VERSION=$(echo "$PROVISION_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("agent_version", "3.0"))')
# Rejection may arrive as 2xx JSON carrying only a message (see above).
PROVISION_ERROR=$(echo "$PROVISION_RESPONSE" | python3 -c 'import sys, json; print(json.load(sys.stdin).get("message", ""))' 2>/dev/null || true)

if [[ -z "$DOWNLOAD_URL" ]] || [[ -z "$SERVER_URL" ]]; then
    if [[ -n "$PROVISION_ERROR" ]]; then
        fail "Provision rejected by server: $PROVISION_ERROR"
    fi
    fail "Invalid bootstrap configuration returned by server."
fi

# ─── Dedicated service user (created once; reused on attach) ─
if ! id "$SERVICE_USER" &>/dev/null; then
    log "Creating service user '$SERVICE_USER'..."
    useradd \
        --system \
        --no-create-home \
        --shell /usr/sbin/nologin \
        --comment "Monitor Agent Service User" \
        "$SERVICE_USER"
fi

# ─── Per-installation state directory (single, stable) ──────
# The data root holds the shared state for the single agent: config.json,
# agent.log, startup.log and the identity key (identity-<uuid>.pem, mode 0600).
# The service user must own it so the running agent can read/write these.
mkdir -p "$DATA_ROOT"
chmod 700 "$DATA_ROOT" 2>/dev/null || true
chown "$SERVICE_USER":"$SERVICE_USER" "$DATA_ROOT"

mkdir -p "$INSTANCE_DIR"
chown -R "$SERVICE_USER":"$SERVICE_USER" "$INSTANCE_DIR"

# ─── Shared binary location (one binary, not per-instance) ──
mkdir -p "$APP_ROOT"
chmod 755 "$APP_ROOT"
chown root:root "$APP_ROOT"

NEED_DOWNLOAD=true
if [[ -f "$AGENT_FILE" && -n "$EXPECTED_SHA256" ]]; then
    CURRENT_SHA256=$(sha256sum "$AGENT_FILE" | awk '{print $1}')
    if [[ "$CURRENT_SHA256" == "$EXPECTED_SHA256" ]]; then
        NEED_DOWNLOAD=false
        log "Agent binary already up to date."
    fi
fi

if [[ "$NEED_DOWNLOAD" == true ]]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  Downloading agent from $DOWNLOAD_URL..." | tee -a "$LOG_FILE" >/dev/null
    printf "Downloading agent"
    ( curl -fsSL "${NGROK_CURL_ARGS[@]}" -o "$AGENT_FILE.tmp" "$DOWNLOAD_URL" 2>/dev/null ) &
    dl_pid=$!
    animate_while_pid "Downloading agent" $dl_pid
    wait $dl_pid || fail "Failed to download agent."
    printf "\rDownloading agent...   \n"

    if [[ -n "$EXPECTED_SHA256" ]]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  Verifying checksum..." | tee -a "$LOG_FILE" >/dev/null
        printf "Verifying checksum"
        sha256sum "$AGENT_FILE.tmp" > /tmp/monitor-agent-sha.tmp 2>/dev/null &
        hash_pid=$!
        animate_while_pid "Verifying checksum" $hash_pid
        wait $hash_pid
        ACTUAL_SHA256=$(awk '{print $1}' /tmp/monitor-agent-sha.tmp); rm -f /tmp/monitor-agent-sha.tmp
        if [[ "$ACTUAL_SHA256" != "$EXPECTED_SHA256" ]]; then
            rm -f "$AGENT_FILE.tmp"
            fail "Checksum verification failed! Expected $EXPECTED_SHA256, got $ACTUAL_SHA256"
        fi
        printf "\rVerifying checksum...   \n"
        log "Checksum verified."
    fi

    mv "$AGENT_FILE.tmp" "$AGENT_FILE"
    chmod 750 "$AGENT_FILE"
    chown root:"$SERVICE_USER" "$AGENT_FILE"
    log "Agent binary installed successfully."
fi

# ─── Shared config.json (non-secret bootstrap) ────────────────
# The installation_id is stable (reused on attach). The provision_token is
# one-time: the agent consumes it on register and strips it from disk.
cat > "$INSTANCE_DIR/config.json" << EOF
{
    "server_url": "$SERVER_URL",
    "agent_version": "$AGENT_VERSION",
    "installation_id": "$INSTALLATION_ID",
    "provision_token": "$TOKEN"
}
EOF
chmod 600 "$INSTANCE_DIR/config.json"
chown "$SERVICE_USER":"$SERVICE_USER" "$INSTANCE_DIR/config.json"

# ─── Stable systemd unit (created once; idempotent on attach) ─
if [[ "$ATTACH" -eq 0 ]]; then
    log "Creating stable systemd unit ${STABLE_UNIT}..."
    cat > "$SERVICE_FILE" << EOF
[Unit]
Description=Monitoring Agent (single per-host service)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=$AGENT_FILE -instance $INSTALLATION_ID
Restart=on-failure
RestartSec=5
User=$SERVICE_USER
Group=$SERVICE_USER
Environment=MONITOR_AGENT_INSTANCE=$INSTALLATION_ID

# Hardening
NoNewPrivileges=yes
PrivateTmp=yes
ProtectSystem=strict
ReadWritePaths=$DATA_ROOT $APP_ROOT
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
    systemctl daemon-reload
fi

# ─── Enable and start (restart on attach picks up the new token) ─
echo "[$(date '+%Y-%m-%d %H:%M:%S')] [INFO]  Enabling and starting service..." | tee -a "$LOG_FILE" >/dev/null
printf "Enabling and starting service"
( systemctl enable "$STABLE_UNIT" 2>/dev/null; systemctl restart "$STABLE_UNIT" 2>/dev/null ) &
svc_pid=$!
animate_while_pid "Enabling and starting service" $svc_pid
wait $svc_pid
printf "\rEnabling and starting service...   \n"

# poll until service is active (up to 15s) with animated ellipsis — cursor follows dot
printf "Waiting for service to be running"
for i in $(seq 1 15); do
    systemctl is-active --quiet "$STABLE_UNIT" && { printf "\rWaiting for service to be running...   \n"; break; }
    case $((i%3)) in 0) printf "\rWaiting for service to be running.  \b\b";;1) printf "\rWaiting for service to be running.. \b";;2) printf "\rWaiting for service to be running...";;esac
    sleep 1
done
printf "\rWaiting for service to be running...   \n"
if systemctl is-active --quiet "$STABLE_UNIT"; then
    log "Service is running."
else
    warn "Service may have failed to start. Check: journalctl -u ${STABLE_UNIT}"
fi

if [[ "$ATTACH" -eq 1 ]]; then
    log "Server attached to existing agent installation ${INSTALLATION_ID}."
    log "Agent will register immediately on next startup (register+auth, ~3s)."
else
    log "Installation complete — agent will register immediately on startup (~3s)."
fi
echo ""
echo "  Installation ID : ${INSTALLATION_ID}"
echo "  To check status : systemctl status ${STABLE_UNIT}"
echo "  To view logs    : journalctl -u ${STABLE_UNIT} -f"
echo "  Install log     : ${LOG_FILE}"
