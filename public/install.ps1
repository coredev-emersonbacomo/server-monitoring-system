param(
    [Parameter(Mandatory=$true)]
    [string]$ProvisionToken,

    [Parameter(Mandatory=$false)]
    [string]$AppUrl = "{{APP_URL}}"
)

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    exit 1
}

# Every installation gets a fresh, immutable UUID. It names the instance
# directory, the keystore identity and the Windows service, so multiple agents
# on one machine never collide.
$InstallationId = [guid]::NewGuid().ToString()
$ServiceName = "MonitorAgent-$InstallationId"
$KeyName = "MonitorAgentIdentity-$InstallationId"
$DataRoot = "C:\ProgramData\MonitorAgent"
$InstanceDir = "$DataRoot\instances\$InstallationId"
$AppDir = "C:\Program Files\MonitorAgent\$InstallationId"
$AgentFile = "$AppDir\MonitorAgent.exe"
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

Log "Starting MonitorAgent installation (instance: $InstallationId)..."

$bootstrapUrl = "$($AppUrl.TrimEnd('/'))/api/v1/provision"
Log "Contacting provision endpoint..."
$body = @{
    token = $ProvisionToken
    hostname = [System.Net.Dns]::GetHostName()
    platform = "windows"
    architecture = $env:PROCESSOR_ARCHITECTURE
    installer_version = "99"
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

# --- Collision prevention -------------------------------------
if (Test-Path $InstanceDir) {
    Fail "Installation directory already exists: $InstanceDir"
}
if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    Fail "A service named $ServiceName already exists - installation collision."
}
if (Test-Path $AgentFile) {
    $keyCheck = & "$AgentFile" -has-key -key $KeyName 2>$null
    if ($LASTEXITCODE -eq 0) {
        Fail "Identity key $KeyName already exists in the keystore - installation collision."
    }
}

# --- Per-installation program folder (never shared with other agents) ---
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
        Remove-Item "$AgentFile.tmp" -Force
        Fail "Failed to replace agent binary (is another instance running?): $_"
    }
}

# --- Instance config ------------------------------------------
New-Item -ItemType Directory -Path $InstanceDir -Force | Out-Null
$agentConfig = @{
    server_url = $serverUrl
    agent_version = $agentVersion
    installation_id = $InstallationId
    provision_token = $ProvisionToken
} | ConvertTo-Json
Set-Content -Path "$InstanceDir\config.json" -Value $agentConfig -Force
Log "Instance configuration written."

try {
    & "$AgentFile" -install -instance $InstallationId | Out-Null
    if ($LASTEXITCODE -ne 0) { Fail "Agent service registration failed." }
    Log "Windows service $ServiceName registered and started."
} catch {
    Fail "Could not register Windows service: $_"
}

Log "Installation complete."
