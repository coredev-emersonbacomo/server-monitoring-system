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
    Start-Process -FilePath $pwsh -Verb RunAs -ArgumentList $relaunch -Wait

    # The elevated child wrote its progress to $LogFile; surface it here so the
    # results appear in this (non-elevated) shell once the child closes.
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

Log "Uninstalling instance: $Instance"

$InstanceDir = "$DataRoot\instances\$Instance"

# Marker-based uninstall: write the flag into the instance directory, then
# restart the stable service. The running service (LocalSystem) revokes the
# agent on the backend and deletes its own identity key, then exits. This
# script then removes the service registration and the instance directory.
if (-not (Test-Path $InstanceDir)) {
    Fail "No MonitorAgent instance found for UUID: $Instance"
}

$AgentFile = "C:\Program Files\MonitorAgent\MonitorAgent.exe"
if (Test-Path $AgentFile) {
    & "$AgentFile" -uninstall -instance $Instance
    if ($LASTEXITCODE -ne 0) {
        Log "Warning: marker-based uninstall reported an error (exit $LASTEXITCODE)."
    }
} else {
    Log "Agent binary not found - removing service registration directly."
}

if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
    Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
    sc.exe delete $ServiceName | Out-Null
    Log "Removed service registration."
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
