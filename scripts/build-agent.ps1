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
