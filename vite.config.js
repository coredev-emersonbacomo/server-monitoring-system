import { defineConfig } from "vite";
import laravel from "laravel-vite-plugin";
import { bunny } from "laravel-vite-plugin/fonts";
import tailwindcss from "@tailwindcss/vite";

const ngrokDomain = process.env.NGROK_DOMAIN || "";

export default defineConfig({
    plugins: [
        laravel({
            input: ["resources/css/app.css", "resources/js/app.js"],
            refresh: true,
            fonts: [
                bunny("Instrument Sans", {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        tailwindcss(),
    ],
    server: {
        host: "0.0.0.0",
        allowedHosts: ngrokDomain ? [ngrokDomain] : true,
        hmr: ngrokDomain ? {
            host: ngrokDomain,
            protocol: "wss",
            clientPort: 443,
        } : undefined,
    },
});
