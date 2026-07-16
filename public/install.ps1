param(
    [Parameter(Mandatory=$true)]
    [string]$ProvisionToken,

    [Parameter(Mandatory=$false)]
    [string]$AppUrl = "http://127.0.0.1:8000"
)

$bootstrapUrl = "$AppUrl/api/v1/provision"
$appDir = "C:\Program Files\MonitorAgent"
$agentFile = "$appDir\MonitorAgent.exe"
$logFile = "$env:TEMP\monitor-agent-install.log"

function Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp [INFO] $msg" | Out-File -FilePath $logFile -Append
    Write-Host $msg
}

function Fail($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp [ERROR] $msg" | Out-File -FilePath $logFile -Append
    Write-Error $msg
    exit 1
}

Log "Starting MonitorAgent installation..."

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
$apiUrl = $response.api_url
$registerUrl = $response.register_url
$heartbeatInterval = $response.heartbeat_interval
$agentVersion = $response.agent_version
if (-not $apiUrl -or -not $registerUrl) {
    Fail "Invalid bootstrap configuration returned by server."
}

$serviceName = "MonitorAgent"
if (Get-Service -Name $serviceName -ErrorAction SilentlyContinue) {
    Log "Stopping existing service to release file lock..."
    Stop-Service -Name $serviceName -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

if (-not (Test-Path $appDir)) {
    New-Item -ItemType Directory -Path $appDir -Force | Out-Null
}

Log "Downloading agent binary from $downloadUrl..."
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile "$agentFile.tmp" -UseBasicParsing
} catch {
    Fail "Failed to download agent: $_"
}

if ($expectedSha256) {
    Log "Verifying checksum..."
    $actualHash = (Get-FileHash "$agentFile.tmp" -Algorithm SHA256).Hash.ToLower()
    if ($actualHash -ne $expectedSha256.ToLower()) {
        Remove-Item "$agentFile.tmp" -Force
        Fail "Checksum verification failed! Expected $expectedSha256, got $actualHash"
    }
    Log "Checksum verified."
}

Move-Item "$agentFile.tmp" $agentFile -Force

$bootstrapJson = @{
    token = $ProvisionToken
    api_url = $apiUrl
    register_url = $registerUrl
    heartbeat_interval = $heartbeatInterval
    hostname = [System.Net.Dns]::GetHostName()
    agent_version = $agentVersion
} | ConvertTo-Json

Set-Content -Path "$appDir\bootstrap.json" -Value $bootstrapJson -Force
Log "Bootstrap configuration written."

try {
    & "$agentFile" -install | Out-Null
    Log "Windows service registered and started via agent."
} catch {
    Log "Warning: Could not register Windows service: $_"
    Log "You can manually run the agent: $agentFile"
}

Log "Installation complete."
