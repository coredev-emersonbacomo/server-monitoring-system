$appUrl = "{{APP_URL}}"
$bootstrapUrl = "$appUrl/api/v1/provision"

Write-Host "Starting monitor-agent installation bootstrap on Windows..."

if (-not $token) {
    Write-Error "No provisioning token found. Make sure `$token is set before running this script."
    exit 1
}

$body = @{
    token = $token
    hostname = [System.Net.Dns]::GetHostName()
    platform = "windows"
    architecture = $env:PROCESSOR_ARCHITECTURE
    installer_version = "1.0"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri $bootstrapUrl -Method Post -Body $body -ContentType "application/json"
} catch {
    Write-Error "Failed to contact provision API or token invalid: $_"
    exit 1
}

$downloadUrl = $response.download_url
$expectedSha256 = $response.expected_sha256
$apiUrl = $response.api_url
$registerUrl = $response.register_url
$heartbeatInterval = $response.heartbeat_interval
$agentVersion = $response.agent_version

$appDir = "C:\Program Files\MonitorAgent"
if (-not (Test-Path $appDir)) {
    New-Item -ItemType Directory -Path $appDir | Out-Null
}

$agentFile = "$appDir\agent.php"
Write-Host "Downloading agent binary/script from $downloadUrl..."
Invoke-WebRequest -Uri $downloadUrl -OutFile "$agentFile.tmp" -UseBasicParsing

if ($expectedSha256) {
    Write-Host "Verifying checksum..."
    $actualHash = (Get-FileHash "$agentFile.tmp" -Algorithm SHA256).Hash.ToLower()
    if ($actualHash -ne $expectedSha256.ToLower()) {
        Remove-Item "$agentFile.tmp" -Force
        Write-Error "Checksum verification failed! Expected $expectedSha256, got $actualHash"
        exit 1
    }
}

Move-Item "$agentFile.tmp" $agentFile -Force

$bootstrapJson = @{
    token = $token
    api_url = $apiUrl
    register_url = $registerUrl
    heartbeat_interval = $heartbeatInterval
    hostname = [System.Net.Dns]::GetHostName()
    agent_version = $agentVersion
} | ConvertTo-Json

Set-Content -Path "$appDir\bootstrap.json" -Value $bootstrapJson

Write-Host "Bootstrap config written. Registering as Windows Service..."

Write-Host "Installation complete. Please run the agent using: php `"$agentFile`""