import path from "path";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { watchLaravelApi } from "./plugins/watchLaravelApi";

const ngrokDomain = process.env.NGROK_DOMAIN || "";
// Backend for ALL proxy targets below. Set ONLY by `npm run ngrok` (exported
// for its spawned Vite process). Plain `npm run dev` must NOT read
// NGROK_UPSTREAM from .env — that value targets the Docker app, which is
// dead air in Herd mode — so the fallback stays the Herd hostname.
const upstream = process.env.VITE_BACKEND_URL || "http://server-monitoring-system.test";

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        babel({ presets: [reactCompilerPreset()] }),
        watchLaravelApi(),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 5173,
        host: "0.0.0.0",
        allowedHosts: ngrokDomain ? [ngrokDomain] : ["localhost", "127.0.0.1"],
        hmr: ngrokDomain ? {
            // Tunnel serves https on 443 only: the browser must open
            // wss://<domain> (no :5173 — ngrok free has no remote ports),
            // otherwise the HMR client tries ws://host:5173 and fails.
            host: ngrokDomain,
            protocol: "wss",
            clientPort: 443,
        } : undefined,
        proxy: {
            // Reverb WebSocket (/app/<key>): the ngrok tunnel only reaches
            // Vite :5173, so the WS upgrade must ride through like HMR does
            // instead of hitting Reverb directly (localhost hits 127.0.0.1:8081
            // and never touches this proxy).
            "/app": {
                target: "http://127.0.0.1:8081",
                changeOrigin: true,
                ws: true,
            },
            "/api": {
                target: upstream,
                changeOrigin: true,
            },
            "/sanctum": {
                target: upstream,
                changeOrigin: true,
            },
            // Agent lifecycle + binary downloads are Laravel-side (web routes
            // and public/ files) with no Vite equivalent — proxy them too so
            // install commands work through the tunnel end to end.
            "/install": {
                target: upstream,
                changeOrigin: true,
            },
            "/uninstall": {
                target: upstream,
                changeOrigin: true,
            },
            "/detach": {
                target: upstream,
                changeOrigin: true,
            },
            "/agent": {
                target: upstream,
                changeOrigin: true,
            },
            "/MonitorAgent.exe": {
                target: upstream,
                changeOrigin: true,
            },
            // Laravel-only pages (no Vite equivalent) must also reach the
            // backend through the tunnel, e.g. /telescope in HMR flow.
            "/telescope": {
                target: upstream,
                changeOrigin: true,
            },
        },
    },
});
