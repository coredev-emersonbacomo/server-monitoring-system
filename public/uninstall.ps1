param(
    [Parameter(Mandatory=$true)]
    [string]$Instance
)

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    exit 1
}

# An instance is targeted by its immutable installation UUID only — this is the
# public identity the installer names the instance directory, the keystore key
# and the service's -instance argument after. There is no multi-delete: every
# agent on this host has a distinct UUID, so only the named one is removed.
# The service itself is the single stable "MonitorAgent" per host.
$ServiceName = "MonitorAgent"
$DataRoot = "C:\ProgramData\MonitorAgent"
$LogFile = "$env:TEMP\monitor-agent-uninstall.log"

function Log($msg) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [INFO] $msg" | Out-File -FilePath $LogFile -Append
    Write-Host $msg
}

function Fail($msg) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [ERROR] $msg" | Out-File -FilePath $LogFile -Append
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
