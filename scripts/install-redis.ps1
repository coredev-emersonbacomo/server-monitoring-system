<#
.SYNOPSIS
    Downloads and installs the latest Redis Windows (non-Service) ZIP build.

.DESCRIPTION
    Queries the redis-windows GitHub releases for the latest release, downloads
    the non-Service MSYS2 ZIP asset (Redis-<version>-Windows-x64-msys2.zip),
    extracts it to C:\redis (the path the dev tooling falls back to), and
    verifies that C:\redis\redis-server.exe exists and runs.

.PARAMETER Destination
    The extraction directory. Defaults to C:\redis.

.PARAMETER Force
    Re-download and re-extract even if the destination already contains
    redis-server.exe.

.EXAMPLE
    .\scripts\install-redis.ps1

.EXAMPLE
    .\scripts\install-redis.ps1 -Destination C:\redis -Force
#>
[CmdletBinding()]
param(
    [string]$Destination = 'C:\redis',
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

if ((Test-Path (Join-Path $Destination 'redis-server.exe')) -and (-not $Force)) {
    Write-Host "redis-server.exe already exists at $Destination. Use -Force to reinstall."
    exit 0
}

$releasesApi = 'https://api.github.com/repos/redis-windows/redis-windows/releases/latest'
$zipPath = Join-Path $env:TEMP 'redis-windows-latest.zip'

Write-Host "Fetching latest redis-windows release from $releasesApi ..."
$release = Invoke-RestMethod -Uri $releasesApi -Headers @{'Accept' = 'application/vnd.github+json'}
$tag   = $release.tag_name
$asset = $release.assets |
    Where-Object { $_.name -match '^Redis-.*-Windows-x64-msys2\.zip$' } |
    Select-Object -First 1

if (-not $asset) {
    Write-Error "No non-Service '*-Windows-x64-msys2.zip' asset found in release $tag."
    exit 1
}

Write-Host "Latest release: $tag  ->  downloading $($asset.name) ..."
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $zipPath -UseBasicParsing
if (-not (Test-Path $zipPath)) {
    Write-Error "Download failed: $zipPath not found."
    exit 1
}

if (-not (Test-Path $Destination)) {
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
}

Write-Host "Extracting $zipPath to $Destination ..."
Expand-Archive -LiteralPath $zipPath -DestinationPath $Destination -Force
Remove-Item $zipPath -Force

$serverExe = Join-Path $Destination 'redis-server.exe'
if (-not (Test-Path $serverExe)) {
    Write-Error "Verification failed: $serverExe not found after extraction."
    exit 1
}

$ver = & $serverExe --version 2>&1
Write-Host "OK: $serverExe"
Write-Host $ver
