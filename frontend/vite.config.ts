import path from "path";
import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import { watchLaravelApi } from "./plugins/watchLaravelApi";

// https://vite.dev/config/
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
        // allowedHosts: ["chip-colt-fretted.ngrok-free.dev"],
        // target: "http://127.0.0.1:8000" server-monitoring-system.test,
        proxy: {
            "/api": {
                target: "http://server-monitoring-system.test",
                changeOrigin: true,
            },
            "/sanctum": {
                target: "http://server-monitoring-system.test",
                changeOrigin: true,
            },
        },
    },
});
