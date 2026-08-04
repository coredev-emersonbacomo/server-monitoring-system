param(
    [Parameter(Mandatory=$false)]
    [string]$ProvisionToken,

    [Parameter(Mandatory=$false)]
    [string]$AppUrl = "{{APP_URL}}"
)

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    exit 1
}

$appDir = "C:\Program Files\MonitorAgent"
$bootstrapFile = "$appDir\bootstrap.json"
$logFile = "$env:TEMP\monitor-agent-uninstall.log"

function Log($msg) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$timestamp [INFO] $msg" | Out-File -FilePath $logFile -Append
    Write-Host $msg
}

Log "Starting MonitorAgent uninstallation..."

$agentFile = "$appDir\MonitorAgent.exe"
if (Test-Path $agentFile) {
    try {
        & "$agentFile" -uninstall | Out-Null
        Log "Windows service stopped and removed via agent."
    } catch {
        Log "Warning: Could not remove service via agent: $_"
    }
}

$token = $ProvisionToken
if (-not $token -and (Test-Path $bootstrapFile)) {
    try {
        $config = Get-Content -Path $bootstrapFile | ConvertFrom-Json
        $token = $config.token
    } catch {}
}

if ($token) {
    Log "Notifying backend of uninstallation..."
    $uninstallUrl = "$($AppUrl.TrimEnd('/'))/api/v1/agent/uninstall"
    $body = @{
        token = $token
        platform = "windows"
    } | ConvertTo-Json
    try {
        Invoke-RestMethod -Uri $uninstallUrl -Method Post -Body $body -ContentType "application/json" | Out-Null
        Log "Backend notified successfully."
    } catch {
        Log "Warning: Failed to notify backend: $_"
    }
}

# 3. Clean up folder
if (Test-Path $appDir) {
    try {
        Remove-Item -Recurse -Force $appDir
        Log "App directory '$appDir' removed."
    } catch {
        Log "Warning: Could not remove directory completely: $_"
    }
}

Log "Uninstallation complete."
