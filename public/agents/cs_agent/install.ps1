param(
    [Parameter(Mandatory=$true)]
    [string]$ProvisionToken
)

$appUrl = "{{APP_URL}}"
$bootstrapUrl = "$appUrl/api/v1/provision"
$appDir = "C:\Program Files\MonitorAgent"
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

Log "Starting C# MonitorAgent installation..."

# Step 1: Bootstrap with server
Log "Contacting provision endpoint..."
$body = @{
    token = $ProvisionToken
    hostname = [System.Net.Dns]::GetHostName()
    platform = "windows"
    architecture = $env:PROCESSOR_ARCHITECTURE
    installer_version = "2.0"
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

# Step 2: Create directory
if (-not (Test-Path $appDir)) {
    New-Item -ItemType Directory -Path $appDir -Force | Out-Null
}

# Step 3: Download agent binary
$agentFile = "$appDir\MonitorAgent.exe"
Log "Downloading C# agent binary from $downloadUrl..."
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

# Step 4: Write bootstrap config
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

# Step 5: Create Windows scheduled task for resilience
$taskName = "MonitorAgent"
$action = New-ScheduledTaskAction -Execute $agentFile
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 5 -RestartInterval (New-TimeSpan -Minutes 1)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

try {
    Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Force
    Start-ScheduledTask -TaskName $taskName
    Log "Scheduled task '$taskName' created and started."
} catch {
    Log "Warning: Could not create scheduled task: $_"
    Log "You can manually run the agent: $agentFile"
}

Log "Installation complete. Agent is running as scheduled task '$taskName'."
