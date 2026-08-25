param(
    [Parameter(Mandatory=$true)]
    [string]$Instance,
    [Parameter(Mandatory=$true)]
    [string]$Server
)

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    exit 1
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
