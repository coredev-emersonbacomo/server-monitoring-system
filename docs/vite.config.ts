import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
    ],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
    server: {
        port: 5174,
        // Bind all IPv4 interfaces like the frontend server: without this
        // Vite binds localhost (often ::1 only on Windows), refusing
        // 127.0.0.1 — which is exactly what the /docs proxy and the
        // ngrok health check dial.
        host: "0.0.0.0",
    },
    // Served under /docs/ everywhere (locally and via the frontend
    // /docs proxy over the tunnel), so asset/HMR URLs carry the prefix.
    base: "/docs/",
});
