import path from "path";
import { type Plugin } from "vite";
import { exec } from "child_process";

// Custom Vite plugin to watch Laravel backend files and automatically regenerate OpenAPI types
export function watchLaravelApi(): Plugin {
    return {
        name: "watch-laravel-api",
        configureServer(server) {
            // Watch these directories in the Laravel root
            server.watcher.add([
                path.resolve(__dirname, "../../routes/**/*.php"),
                path.resolve(__dirname, "../../app/Data/**/*.php"),
                path.resolve(__dirname, "../../app/Http/Controllers/**/*.php"),
            ]);
        },
        handleHotUpdate({ file }) {
            // If a PHP file changed in the relevant directories
            if (
                file.endsWith(".php") &&
                (file.includes("/routes/") || file.includes("/app/"))
            ) {
                console.log(
                    `\n[api-types] Backend changed: ${path.basename(file)}`,
                );
                console.log(
                    `[api-types] Regenerating OpenAPI schema and TypeScript types...`,
                );

                // Run the types script from the Laravel root
                exec(
                    "npm run types",
                    { cwd: path.resolve(__dirname, "../..") },
                    (err) => {
                        if (err) {
                            console.error(
                                `[api-types] [ERROR] Failed to generate types:`,
                                err.message,
                            );
                        } else {
                            console.log(
                                `[api-types] [SUCCESS] Types regenerated successfully!`,
                            );
                        }
                    },
                );
            }
        },
    };
}
