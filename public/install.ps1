param(
    [Parameter(Mandatory=$true)]
    [string]$ProvisionToken,

    [Parameter(Mandatory=$false)]
    [string]$AppUrl = "{{APP_URL}}"
)

$ErrorActionPreference = "Stop"

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    exit 1
}

# Under the one-agent-per-computer model there is exactly one service per host,
# named "MonitorAgent" (stable -- not per-installation). Detection is by the
# service's presence, not by files or hostname.
$ServiceName = "MonitorAgent"
$DataRoot = "C:\ProgramData\MonitorAgent"
$LogFile = "$env:TEMP\monitor-agent-install.log"

function Log($msg) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [INFO] $msg" | Out-File -FilePath $LogFile -Append
    Write-Host $msg
}

function Fail($msg) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [ERROR] $msg" | Out-File -FilePath $LogFile -Append
    Write-Error $msg
    exit 1
}

# ----- Detect an existing single agent installation -------------
$ExistingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($ExistingService) {
    # Reuse the installation UUID from the existing service's binary path.
    $binaryPath = (Get-WmiObject Win32_Service -Filter "Name='$ServiceName'").PathName
    $ExistingId = ""
    if ($binaryPath -match '-instance\s+([0-9a-fA-F-]+)') {
        $ExistingId = $matches[1]
    }
    if (-not $ExistingId) {
        Fail "Service '$ServiceName' exists but its installation UUID could not be parsed from its binary path."
    }

    $InstallationId = $ExistingId
    $KeyName = "MonitorAgentIdentity-$InstallationId"
    $InstanceDir = "$DataRoot\instances\$InstallationId"
    Log "Detected existing MonitorAgent service (installation: $InstallationId) -- attaching new server."
    $Attach = $true
} else {
    $InstallationId = [guid]::NewGuid().ToString()
    $KeyName = "MonitorAgentIdentity-$InstallationId"
    $InstanceDir = "$DataRoot\instances\$InstallationId"
    Log "No existing service found -- creating new single-agent installation (instance: $InstallationId)."
    $Attach = $false
}

$AppDir = "C:\Program Files\MonitorAgent"
$AgentFile = "$AppDir\MonitorAgent.exe"

# ----- Contact Provision Endpoint ------------------------------
$bootstrapUrl = "$($AppUrl.TrimEnd('/'))/api/v1/provision"
Log "Contacting provision endpoint..."
$body = @{
    token = $ProvisionToken
    hostname = [System.Net.Dns]::GetHostName()
    platform = "windows"
    architecture = $env:PROCESSOR_ARCHITECTURE
    installer_version = "3.0"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $bootstrapUrl -Method Post -Body $body -ContentType "application/json"
} catch {
    Fail "Failed to contact provision API or token invalid: $_"
}

$downloadUrl = $response.download_url
$expectedSha256 = $response.expected_sha256
$serverUrl = $response.server_url
$agentVersion = $response.agent_version
if (-not $serverUrl) {
    Fail "Invalid bootstrap configuration returned by server."
}

# ----- Shared binary location (one binary, not per-installation) -
if (-not (Test-Path $AppDir)) {
    New-Item -ItemType Directory -Path $AppDir -Force | Out-Null
}

$needDownload = $true
if (Test-Path $AgentFile) {
    $currentHash = (Get-FileHash $AgentFile -Algorithm SHA256).Hash.ToLower()
    if ($expectedSha256 -and $currentHash -eq $expectedSha256.ToLower()) {
        $needDownload = $false
        Log "Agent binary already up to date."
    }
}

if ($needDownload) {
    Log "Downloading agent binary from $downloadUrl..."
    try {
        Invoke-WebRequest -Uri $downloadUrl -OutFile "$AgentFile.tmp" -UseBasicParsing
    } catch {
        Fail "Failed to download agent: $_"
    }

    if ($expectedSha256) {
        Log "Verifying checksum..."
        $actualHash = (Get-FileHash "$AgentFile.tmp" -Algorithm SHA256).Hash.ToLower()
        if ($actualHash -ne $expectedSha256.ToLower()) {
            Remove-Item "$AgentFile.tmp" -Force
            Fail "Checksum verification failed! Expected $expectedSha256, got $actualHash"
        }
        Log "Checksum verified."
    }

    try {
        Move-Item "$AgentFile.tmp" $AgentFile -Force
    } catch {
        Remove-Item "$AgentFile.tmp" -Force -ErrorAction Continue
        Fail "Failed to replace agent binary (is another instance running?): $_"
    }
}

# ----- Instance config (single, stable instance dir) -----------
# provision_token is one-time: the agent consumes it on register and strips it.
New-Item -ItemType Directory -Path $InstanceDir -Force | Out-Null
$agentConfig = @{
    server_url = $serverUrl
    agent_version = $agentVersion
    installation_id = $InstallationId
    provision_token = $ProvisionToken
} | ConvertTo-Json
Set-Content -Path "$InstanceDir\config.json" -Value $agentConfig -Force
Log "Instance configuration written."

# ----- Register / re-register the stable Windows service -------
if (-not $Attach) {
    # First install: register the single stable "MonitorAgent" service.
    # The Go binary creates the service pinned to -instance <uuid>.
    try {
        & "$AgentFile" -install -instance $InstallationId | Out-Null
        if ($LASTEXITCODE -ne 0) { Fail "Agent service registration failed." }
        Log "Windows service '$ServiceName' registered and started."
    } catch {
        Fail "Could not register Windows service: $_"
    }
} else {
    # Existing host: restart the stable service so it picks up the new token.
    Log "Restarting existing service '$ServiceName' to pick up new provision token..."
    Restart-Service -Name $ServiceName -Force -ErrorAction Stop
    Log "Service restarted -- agent will register immediately on next startup (register+auth, ~3s)."
}

Log "Installation complete."
