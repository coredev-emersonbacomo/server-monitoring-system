---
paths:
  - frontend/vite.config.ts
---

# Frontend

## Proxy Reverb WS (/app) through Vite for the ngrok tunnel
npm run ngrok tunnels ONLY Vite :5173, so the browser's Reverb WebSocket wss://<domain>/app/<key> must ride through the Vite proxy like HMR does. /app { target http://127.0.0.1:8081, changeOrigin, ws } in server.proxy is load-bearing — without it the ngrok deploy gets no realtime (install/uninstall events need a page reload). Localhost works anyway because it hits 127.0.0.1:8081 directly and never touches the proxy.
