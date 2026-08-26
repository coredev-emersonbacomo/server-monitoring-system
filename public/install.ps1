param(
    [Parameter(Mandatory=$true)]
    [string]$ProvisionToken,

    [Parameter(Mandatory=$false)]
    [string]$AppUrl = "{{APP_URL}}",

    [Parameter(Mandatory=$false)]
    [Alias("Instance")]
    [string]$InstallationId = ""
)

# Shared log path: the elevated child writes progress here, and the waiting
# non-elevated parent reads it back so results surface in the original shell.
$LogFile = "$env:TEMP\monitor-agent-install.log"

$ErrorActionPreference = "Stop"

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    # Not elevated: ask the user, then relaunch self elevated through a UAC
    # prompt. The file is already on disk (downloaded by the irm step), so
    # -File re-runs it with the same arguments as Administrator. We pass the
    # full powershell.exe path because Start-Process -Verb RunAs cannot resolve
    # a bare "powershell" command.
    $choice = Read-Host "This shell does not have Administrator privileges. Relaunch as Administrator? (Y/N)"
    if ($choice -and $choice -notmatch '^[Yy]') {
        Write-Host "Aborted. Please re-run this script as Administrator." -ForegroundColor Yellow
        exit 1
    }
    $pwsh = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $relaunch = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $MyInvocation.MyCommand.Path)
    if ($ProvisionToken) { $relaunch += "-ProvisionToken"; $relaunch += $ProvisionToken }
    if ($AppUrl -and $AppUrl -ne "{{APP_URL}}") { $relaunch += "-AppUrl"; $relaunch += $AppUrl }
    if ($InstallationId) { $relaunch += "-InstallationId"; $relaunch += $InstallationId }
    Start-Process -FilePath $pwsh -Verb RunAs -ArgumentList $relaunch -Wait

    # The elevated child wrote its progress to $LogFile; surface it here so the
    # results appear in this (non-elevated) shell once the child closes.
    if (Test-Path $LogFile) {
        Write-Host ""
        Write-Host "=== Install log (elevated) ===" -ForegroundColor Cyan
        [System.IO.File]::ReadAllLines($LogFile) | ForEach-Object { Write-Host $_ }
        Write-Host "=== End of log ===" -ForegroundColor Cyan
    }
    exit
}

# Under the one-agent-per-computer model there is exactly one service per host,
# named "MonitorAgent" (stable -- not per-installation). Detection is by the
# service's presence, not by files or hostname.
$ServiceName = "MonitorAgent"
$DataRoot = "C:\ProgramData\MonitorAgent"
# Start each elevated run with a fresh log so the parent shows only this run.
[System.IO.File]::WriteAllText($LogFile, "")

function Log($msg) {
    [System.IO.File]::AppendAllText($LogFile, "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [INFO] $msg`r`n")
    Write-Host $msg
}

function Fail($msg) {
    [System.IO.File]::AppendAllText($LogFile, "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [ERROR] $msg`r`n")
    Write-Error $msg
    exit 1
}

# ----- Detect an existing single agent installation -------------
$ExistingService = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
$ExistingId = ""
$Attach = $false

if ($InstallationId) {
    # Force reinstall / specified installation UUID: use this exact UUID from DB
    $KeyName = "MonitorAgentIdentity-$InstallationId"
    $InstanceDir = "$DataRoot\instances\$InstallationId"
    Log "Using specified installation UUID ($InstallationId) for installation/reinstallation."
    $Attach = $false
} elseif ($ExistingService) {
    # Reuse the installation UUID from the existing service's binary path.
    $binaryPath = (Get-WmiObject Win32_Service -Filter "Name='$ServiceName'").PathName
    if ($binaryPath -match '-instance\s+([0-9a-fA-F-]+)') {
        $ExistingId = $matches[1]
    } elseif (Test-Path "$DataRoot\instances") {
        $foundInstances = Get-ChildItem "$DataRoot\instances" -Directory -ErrorAction SilentlyContinue | Where-Object { $_.Name -match '^[0-9a-fA-F-]+$' }
        if ($foundInstances.Count -eq 1) {
            $ExistingId = $foundInstances[0].Name
            Log "Recovered installation UUID ($ExistingId) from instance directory."
        }
    }

    if ($ExistingId) {
        $InstallationId = $ExistingId
        $KeyName = "MonitorAgentIdentity-$InstallationId"
        $InstanceDir = "$DataRoot\instances\$InstallationId"
        Log "Detected existing MonitorAgent service (installation: $InstallationId) -- attaching new server."
        $Attach = $true
    } else {
        Log "Warning: Existing service '$ServiceName' does not have a valid installation UUID in binary path or instance directory. Re-registering service as a new installation."
        $InstallationId = [guid]::NewGuid().ToString()
        $KeyName = "MonitorAgentIdentity-$InstallationId"
        $InstanceDir = "$DataRoot\instances\$InstallationId"
        $Attach = $false
    }
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

    Write-Host ""
    Write-Host "Press any key to close this window..." -ForegroundColor Cyan
    try { [void][System.Console]::ReadKey($true) } catch { }
