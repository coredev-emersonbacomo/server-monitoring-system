$goPath = Get-Command "go" -ErrorAction SilentlyContinue
if (-not $goPath) {
    $goPath = Get-Command "C:\Program Files\Go\bin\go.exe" -ErrorAction SilentlyContinue
}
if (-not $goPath) {
    Write-Error "Go not found. Install from https://go.dev/dl/"
    exit 1
}
$goPath = $goPath.Source

Push-Location (Join-Path $PSScriptRoot "..\resources\agent\go")

$env:GOOS = "linux"
$env:GOARCH = "amd64"
$env:CGO_ENABLED = "0"
Write-Host "Building Linux agent..."
& $goPath build -o (Join-Path $PSScriptRoot "..\public\agent") .
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }

$env:GOOS = "windows"
$env:GOARCH = "amd64"
$env:CGO_ENABLED = "0"
Write-Host "Building Windows agent..."
& $goPath build -o (Join-Path $PSScriptRoot "..\public\MonitorAgent.exe") .
if ($LASTEXITCODE -ne 0) { Pop-Location; exit 1 }

Pop-Location
Write-Host "Done: agent (Linux) + MonitorAgent.exe (Windows)"

# --- Auto-detect binary changes and bump AgentVersion ---
Write-Host ""
Write-Host "Checking for binary changes..."
$laravelRoot = Join-Path $PSScriptRoot ".."
$phpCmd = Get-Command "php" -ErrorAction SilentlyContinue
if ($phpCmd) {
    & php (Join-Path $laravelRoot "artisan") agent:version-sync
} else {
    Write-Warning "php not found in PATH - skipping auto version-sync. Run 'php artisan agent:version-sync' manually."
}
