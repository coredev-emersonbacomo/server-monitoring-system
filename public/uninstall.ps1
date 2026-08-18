param(
    [Parameter(Mandatory=$false)]
    [string]$Instance,
    [Parameter(Mandatory=$false)]
    [string]$ProvisionToken
)

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERROR: This script must be run as Administrator." -ForegroundColor Red
    exit 1
}

$DataRoot = "C:\ProgramData\MonitorAgent"
$AppRoot = "C:\Program Files\MonitorAgent"
$LogFile = "$env:TEMP\monitor-agent-uninstall.log"

function Log($msg) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') [INFO] $msg" | Out-File -FilePath $LogFile -Append
    Write-Host $msg
}

# ProvisionToken is accepted for CLI symmetry with install.ps1 but not needed:
# the marker flow revokes on the backend using the running service's own JWT.
# Use -Instance <uuid> to target one installation; otherwise all are removed.
$instances = @()
if ($Instance) {
    $instances = @($Instance)
} elseif (Test-Path "$DataRoot\instances") {
    $instances = Get-ChildItem "$DataRoot\instances" -Directory | ForEach-Object { $_.Name }
}

if ($instances.Count -eq 0) {
    Log "No MonitorAgent installations found. Nothing to uninstall."
    exit 0
}

foreach ($installationId in $instances) {
    Log "Uninstalling instance: $installationId"
    $ServiceName = "MonitorAgent-$installationId"
    $InstanceDir = "$DataRoot\instances\$installationId"
    $AppDir = "$AppRoot\$installationId"
    $AgentFile = "$AppDir\MonitorAgent.exe"

    if (Test-Path $AgentFile) {
        # Marker-based uninstall: the script writes the flag, stops the service,
        # and the service (running as LocalSystem) revokes the agent on the
        # backend, deletes its own keystore key, then exits. This script then
        # removes the service registration and the instance directory.
        & "$AgentFile" -uninstall -instance $installationId
        if ($LASTEXITCODE -ne 0) {
            Log "Warning: marker-based uninstall reported an error (exit $LASTEXITCODE)."
        }
    } else {
        # Binary missing - fall back to manual cleanup. The keystore key may
        # remain (only LocalSystem can delete it) but is inert.
        Log "Agent binary not found - manual cleanup."
        if (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue) {
            Stop-Service -Name $ServiceName -Force -ErrorAction SilentlyContinue
            sc.exe delete $ServiceName | Out-Null
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

    if (Test-Path $AppDir) {
        try {
            Remove-Item -Recurse -Force $AppDir
            Log "Removed program directory."
        } catch {
            Log "Warning: could not remove program directory: $_"
        }
    }
}

Log "Uninstallation complete."
