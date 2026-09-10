param(
    [Parameter(Mandatory=$true)]
    [string]$Instance
)

# Shared log path: the elevated child writes progress here, and the waiting
# non-elevated parent reads it back so results surface in the original shell.
$LogFile = "$env:TEMP\monitor-agent-uninstall.log"

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    # Not elevated: ask, then relaunch self elevated through a UAC prompt.
    $choice = Read-Host "This shell does not have Administrator privileges. Relaunch as Administrator? (Y/N)"
    if ($choice -and $choice -notmatch '^[Yy]') {
        Write-Host "Aborted. Please re-run this script as Administrator." -ForegroundColor Yellow
        exit 1
    }
    $pwsh = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $relaunch = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $MyInvocation.MyCommand.Path, "-Instance", $Instance)
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

    # Only surface log when elevation actually ran; on cancel the file is stale from a prior run.
    if (Test-Path $LogFile) {
        Write-Host ""
        Write-Host "=== Uninstall log (elevated) ===" -ForegroundColor Cyan
        [System.IO.File]::ReadAllLines($LogFile) | ForEach-Object { Write-Host $_ }
        Write-Host "=== End of log ===" -ForegroundColor Cyan
    }
    exit
}

# An instance is targeted by its immutable installation UUID only — this is the
# public identity the installer names the instance directory, the keystore key
# and the service's -instance argument after. There is no multi-delete: every
# agent on this host has a distinct UUID, so only the named one is removed.
# The service itself is the single stable "MonitorAgent" per host.
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

# animate ellipsis while long waits run — cursor follows last dot, not padded end.
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
    param([string]$Message, [string]$ServiceName, [int]$TimeoutSec = 20)
    $i = 0; $deadline = (Get-Date).AddSeconds($TimeoutSec)
    while ((Get-Date) -lt $deadline) {
        $svc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if (-not $svc -or $svc.Status -eq 'Stopped') { break }
        $dots = "." * (($i % 3) + 1); $pad = " " * (3 - $dots.Length); $backs = "`b" * $pad.Length
        Write-Host "`r$Message$dots$pad$backs" -NoNewline; Start-Sleep -Milliseconds 400; $i++
    }
    Write-Host "`r$Message...   "
}

Log "Uninstalling instance: $Instance"

$InstanceDir = "$DataRoot\instances\$Instance"

# Marker-based uninstall: write the flag into the instance directory, then
# restart the stable service. The running service (LocalSystem) revokes the
# agent on the backend and deletes its own identity key, then exits. This
# script then removes the service registration and the instance directory.
if (-not (Test-Path $InstanceDir)) {
    Fail "No MonitorAgent instance found for UUID: $Instance. The agent is already gone from this host; if its record still appears in the dashboard, open the server's Agent tab and use the 'Deregister Agent (clear record)' action to remove the orphaned entry."
}

$AgentFile = "C:\Program Files\MonitorAgent\MonitorAgent.exe"
if (Test-Path $AgentFile) {
    # PowerShell animates the wait — Go suppresses its own \r animation when stdout is piped (isTTY check), so one cursor follows the dots.
    Write-Host "Uninstall marker written; stopping service for cleanup" -NoNewline
    $uJob = Start-Job -ScriptBlock { param($f,$id) & $f -uninstall -instance $id 2>&1; $LASTEXITCODE } -ArgumentList $AgentFile, $Instance
    Wait-JobWithDots "Uninstall marker written; stopping service for cleanup" $uJob
    $uOut = Receive-Job $uJob -Wait
    $uCode = ($uOut | Select-Object -Last 1); $uText = $uOut | Select-Object -SkipLast 1 | Where-Object { $_ -ne "Uninstall marker written; stopping service for cleanup..." -and $_ -ne "Uninstall complete." }
    [System.IO.File]::AppendAllText($LogFile, "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [INFO] Uninstall marker written; stopping service for cleanup...`r`n")
    if ($uText) { $uText | ForEach-Object { Write-Host $_ } ; [System.IO.File]::AppendAllText($LogFile, ($uText -join "`r`n") + "`r`n") }
    Remove-Job $uJob -Force -ErrorAction SilentlyContinue
    if ($uCode -ne 0 -and $null -ne $uCode) {
        Log "Warning: marker-based uninstall reported an error (exit $uCode)."
    }
} else {
    Log "Agent binary not found - removing service registration directly."
}

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    # animate while the service stops — Go already animates the marker path, this covers the fallback direct delete.
    Write-Host "Stopping service for cleanup" -NoNewline
    $stopJob = Start-Job -ScriptBlock { param($n) Stop-Service -Name $n -Force -ErrorAction SilentlyContinue } -ArgumentList $ServiceName
    $i = 0; while ($stopJob.State -eq 'Running') { $d="."*(($i%3)+1); $p=" "*(3-$d.Length); $b="`b"*$p.Length; Write-Host "`rStopping service for cleanup$d$p$b" -NoNewline; Start-Sleep -Milliseconds 400; $i++ }
    try { Receive-Job $stopJob -ErrorAction SilentlyContinue | Out-Null } catch {} finally { Remove-Job $stopJob -Force -ErrorAction SilentlyContinue }
    Write-Host "`rStopping service for cleanup...   "
    Wait-ServiceWithDots "Waiting for service to stop" $ServiceName 15
    sc.exe delete $ServiceName | Out-Null
    # sc delete only marks for deletion; SCM finalizes once all handles
    # close. Wait bounded so a later reinstall never sees 1072, and warn
    # when an open handle (Services console, Task Manager) pins it.
    $deadline = (Get-Date).AddSeconds(30)
    while ((Get-Date) -lt $deadline -and (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue)) { Start-Sleep -Milliseconds 500 }
    if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
        Log "Warning: service '$ServiceName' is still marked-for-deletion (a handle is open). Close Services console / Task Manager and ensure no MonitorAgent.exe runs; reboot before reinstalling if it persists."
    } else {
        Log "Removed service registration."
    }
}

if (Test-Path $InstanceDir) {
    try {
        Remove-Item -Recurse -Force $InstanceDir
        Log "Removed instance directory."
    } catch {
        Log "Warning: could not remove instance directory: $_"
    }
}

    Log "Uninstallation complete."

    Write-Host ""
    Write-Host "Press any key to close this window..." -ForegroundColor Cyan
    try { [void][System.Console]::ReadKey($true) } catch { }
