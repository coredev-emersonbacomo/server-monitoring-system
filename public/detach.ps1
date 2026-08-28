param(
    [Parameter(Mandatory=$true)]
    [string]$Instance,
    [Parameter(Mandatory=$true)]
    [string]$Server
)

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    # Not elevated: ask, then relaunch self elevated through a UAC prompt.
    $choice = Read-Host "This shell does not have Administrator privileges. Relaunch as Administrator? (Y/N)"
    if ($choice -and $choice -notmatch '^[Yy]') {
        Write-Host "Aborted. Please re-run this script as Administrator." -ForegroundColor Yellow
        exit 1
    }
    $pwsh = Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe'
    $relaunch = @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $MyInvocation.MyCommand.Path, "-Instance", $Instance, "-Server", $Server)
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
    exit
}

$ServiceName = "MonitorAgent"
$DataRoot = "C:\ProgramData\MonitorAgent"
$LogFile = "$env:TEMP\monitor-agent-detach.log"

function Log($msg) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [INFO] $msg" | Out-File -FilePath $LogFile -Append
    Write-Host $msg
}

function Fail($msg) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [ERROR] $msg" | Out-File -FilePath $LogFile -Append
    Write-Error $msg
    exit 1
}

Log "Detaching server $Server from instance $Instance"

$InstanceDir = "$DataRoot\instances\$Instance"

if (-not (Test-Path $InstanceDir)) {
    Fail "No MonitorAgent instance found for UUID: $Instance"
}

$AgentFile = "C:\Program Files\MonitorAgent\MonitorAgent.exe"
if (Test-Path $AgentFile) {
    & "$AgentFile" -detach -instance $Instance -server $Server
    if ($LASTEXITCODE -ne 0) {
        Log "Warning: detach reported an error (exit $LASTEXITCODE)."
    } else {
        Log "Detach request sent - server detached immediately (or on next heartbeat if offline)."
    }
} else {
    Fail "Agent binary not found at $AgentFile"
}

    Log "Detach complete for server $Server - agent remains for other servers."

    Write-Host ""
    Write-Host "Press any key to close this window..." -ForegroundColor Cyan
    try { [void][System.Console]::ReadKey($true) } catch { }
