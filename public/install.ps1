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
    try {
        Start-Process -FilePath $pwsh -Verb RunAs -ArgumentList $relaunch -Wait -ErrorAction Stop
    } catch {
        if ($_.Exception.Message -match "canceled") {
            Write-Host "Elevation was canceled. Re-run as Administrator." -ForegroundColor Yellow
        } else {
            Write-Host "Failed to elevate: $($_.Exception.Message)" -ForegroundColor Yellow
        }
        exit 1
    }

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

# minimal ellipsis animation for long waits — \r cycle 1..3 dots so hangs don't look stuck, cursor follows last dot.
function Wait-JobWithDots {
    param([string]$Message, [System.Management.Automation.Job]$Job)
    $i = 0
    while ($Job.State -eq 'Running') {
        $dots = "." * (($i % 3) + 1); $pad = " " * (3 - $dots.Length); $backs = "`b" * $pad.Length
        Write-Host "`r$Message$dots$pad$backs" -NoNewline
        Start-Sleep -Milliseconds 400; $i++
    }
    Write-Host "`r$Message...   "
}

function Wait-ServiceWithDots {
    param([string]$Message, [string]$ServiceName, [int]$TimeoutSec = 30)
    $i = 0
    $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if (-not $svc -or $svc.Status -eq 'Running') { break }
        $dots = "." * (($i % 3) + 1); $pad = " " * (3 - $dots.Length); $backs = "`b" * $pad.Length
        Write-Host "`r$Message$dots$pad$backs" -NoNewline
        Start-Sleep -Milliseconds 400; $i++
    }
    Write-Host "`r$Message...   "
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

# Tunnel bypass header for all in-script HTTP calls below (provision POST,
# binary download). The server replaces {{NGROK_SKIP_BROWSER_WARNING}} with
# "true"/"false" when serving this script; PowerShell's browser-like UA makes
# free-tier ngrok intermittently answer 200 with its interstitial HTML, which
# surfaces as empty fields (e.g. missing server_url). Raw file (unreplaced)
# defaults to no headers and stays valid syntax.
$NgrokHeaders = @{}
if ("{{NGROK_SKIP_BROWSER_WARNING}}" -eq "true") { $NgrokHeaders = @{'ngrok-skip-browser-warning'='true'} }

# ----- Contact Provision Endpoint ------------------------------
$bootstrapUrl = "$($AppUrl.TrimEnd('/'))/api/v1/provision"
[System.IO.File]::AppendAllText($LogFile, "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [INFO] Contacting provision endpoint...`r`n")
$body = @{
    token = $ProvisionToken
    hostname = [System.Net.Dns]::GetHostName()
    platform = "windows"
    architecture = $env:PROCESSOR_ARCHITECTURE
    installer_version = "3.0"
} | ConvertTo-Json
# animate while the provision POST is in flight (can hang on DNS/TLS)
Write-Host "Contacting provision endpoint" -NoNewline
$provJob = Start-Job -ScriptBlock { param($u,$b,$h) Invoke-RestMethod -Uri $u -Method Post -Body $b -ContentType "application/json" -Headers $h } -ArgumentList $bootstrapUrl, $body, $NgrokHeaders
Wait-JobWithDots "Contacting provision endpoint" $provJob
$provErr = $null
try { $response = Receive-Job $provJob -ErrorAction Stop } catch { $provErr = $_ } finally { Remove-Job $provJob -Force -ErrorAction SilentlyContinue }
if ($provErr) { Fail "Failed to contact provision API or token invalid: $provErr" }

$downloadUrl = $response.download_url
$expectedSha256 = $response.expected_sha256
$serverUrl = $response.server_url
$agentVersion = $response.agent_version
if (-not $serverUrl) {
    # Tunnel edges can flatten error statuses to 200 (ngrok does this for
    # large debug bodies), so a rejection may arrive as 2xx JSON carrying
    # only a message. Surface it instead of the cryptic generic failure.
    if ($response.message) { Fail "Provision rejected by server: $($response.message)" }
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
    [System.IO.File]::AppendAllText($LogFile, "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [INFO] Downloading agent binary from $downloadUrl...`r`n")
    Write-Host "Downloading agent binary" -NoNewline
    $dlJob = Start-Job -ScriptBlock { param($u,$o,$h) Invoke-WebRequest -Uri $u -OutFile $o -UseBasicParsing -Headers $h } -ArgumentList $downloadUrl, "$AgentFile.tmp", $NgrokHeaders
    Wait-JobWithDots "Downloading agent binary" $dlJob
    $dlErr = $null
    try { Receive-Job $dlJob -ErrorAction Stop | Out-Null } catch { $dlErr = $_ } finally { Remove-Job $dlJob -Force -ErrorAction SilentlyContinue }
    if ($dlErr) { Fail "Failed to download agent: $dlErr" }

    if ($expectedSha256) {
        [System.IO.File]::AppendAllText($LogFile, "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [INFO] Verifying checksum...`r`n")
        Write-Host "Verifying checksum" -NoNewline
        $hashJob = Start-Job -ScriptBlock { param($p) (Get-FileHash $p -Algorithm SHA256).Hash.ToLower() } -ArgumentList "$AgentFile.tmp"
        Wait-JobWithDots "Verifying checksum" $hashJob
        try { $actualHash = Receive-Job $hashJob -ErrorAction Stop } catch { $actualHash = "" } finally { Remove-Job $hashJob -Force -ErrorAction SilentlyContinue }
        if ($actualHash -ne $expectedSha256.ToLower()) {
            Remove-Item "$AgentFile.tmp" -Force
            Fail "Checksum verification failed! Expected $expectedSha256, got $actualHash"
        }
        Write-Host "`rVerifying checksum...   "
        [System.IO.File]::AppendAllText($LogFile, "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [INFO] Checksum verified.`r`n")
        Write-Host "Checksum verified."
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
    # Reinstall path: a previous `sc.exe delete` only *marks* the service;
    # SCM finalizes it once all handles close. Clear any stale registration
    # first so CreateService never sees ERROR_SERVICE_MARKED_FOR_DELETE (1072).
    $stale = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
    if ($stale) {
        Log "Removing stale service registration '$ServiceName' before reinstall..."
        Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
        Get-Process -Name "MonitorAgent" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        sc.exe delete $ServiceName | Out-Null
        $deadline = (Get-Date).AddSeconds(30)
        while ((Get-Date) -lt $deadline -and (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue)) { Start-Sleep -Milliseconds 500 }
    }
    if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
        Fail "Service '$ServiceName' is stuck marked-for-deletion (another program holds it open). Close Services console / Task Manager, make sure no MonitorAgent.exe is running, then re-run. If it persists, reboot once and re-run."
    }
    # First install: register the single stable "MonitorAgent" service.
    # The Go binary creates the service pinned to -instance <uuid>.
    [System.IO.File]::AppendAllText($LogFile, "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [INFO] Registering Windows service '$ServiceName'...`r`n")
    Write-Host "Registering Windows service" -NoNewline
    $svcJob = Start-Job -ScriptBlock { param($f,$id) & $f -install -instance $id | Out-Null; if ($LASTEXITCODE -ne 0) { throw "service install failed" } } -ArgumentList $AgentFile, $InstallationId
    Wait-JobWithDots "Registering Windows service" $svcJob
    $svcErr = $null; try { Receive-Job $svcJob -ErrorAction Stop | Out-Null } catch { $svcErr = $_ } finally { Remove-Job $svcJob -Force -ErrorAction SilentlyContinue }
    if ($svcErr) {
        if ("$svcErr" -match "marked for deletion") {
            Fail "Could not register Windows service: stale delete-pending registration (close Services console / Task Manager, kill MonitorAgent.exe, or reboot, then re-run): $svcErr"
        }
        Fail "Could not register Windows service: $svcErr"
    }
    Log "Windows service '$ServiceName' registered and started."
} else {
    # Existing host: restart the stable service so it picks up the new token.
    [System.IO.File]::AppendAllText($LogFile, "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [INFO] Restarting existing service '$ServiceName' to pick up new provision token...`r`n")
    Write-Host "Restarting existing service" -NoNewline
    $rstJob = Start-Job -ScriptBlock { param($n) Restart-Service -Name $n -Force -ErrorAction Stop } -ArgumentList $ServiceName
    Wait-JobWithDots "Restarting existing service" $rstJob
    $rstErr = $null; try { Receive-Job $rstJob -ErrorAction Stop | Out-Null } catch { $rstErr = $_ } finally { Remove-Job $rstJob -Force -ErrorAction SilentlyContinue }
    if ($rstErr) { Fail "Could not restart service: $rstErr" }
    Wait-ServiceWithDots "Waiting for service to be running" $ServiceName 15
    Log "Service restarted -- agent will register immediately on next startup (register+auth, ~3s)."
}

    Log "Installation complete."

    Write-Host ""
    Write-Host "Press any key to close this window..." -ForegroundColor Cyan
    try { [void][System.Console]::ReadKey($true) } catch { }
