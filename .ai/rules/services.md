---
paths:
  - 'app/Services/**'
---

# Services

## Build agent binary URLs from APP_URL, not url()
Agent binary URLs (download_url/binary_url for MonitorAgent.exe and /agent) must be built from APP_URL (rtrim(env('APP_URL') ?: url('/'), '/').'/...'), NEVER from url('/path'): the ngrok→Vite proxy uses changeOrigin (Host rewritten to 127.0.0.1:8000), so url() emits a loopback address the remote agent cannot reach — symptom: provision succeeds on the target but "download agent: Unable to connect to the remote server". Same rule applies to ProvisioningService::bootstrap, HeartbeatService (pending_update), SettingController (agent version binary_url), AgentVersionSync.
