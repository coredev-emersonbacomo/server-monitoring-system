#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// Load env files (later files override earlier ones) into process.env. Handles
// quoted values and ${VAR} interpolation. Interpolation is resolved against the
// final merged map, so a VITE_* var can borrow from a non-VITE_* var regardless
// of file order (e.g. VITE_ALERTS_VISUAL_DEBUGGER="${ALERTS_VISUAL_DEBUGGER}").
//
// Existing process.env values always win. This lets tunnel.js inject overrides
// (e.g. VITE_REVERB_HOST=trycloudflare.com) before calling entry.js, which
// loads .env.production — the file provides defaults, process.env stays authoritative.
export function loadEnvIntoProcess(files) {
    const merged = {};
    for (const [index, file] of files.entries()) {
        const envFile = path.join(root, file);
        if (!fs.existsSync(envFile)) continue;
        for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
            const t = line.trim();
            if (!t || t.startsWith('#') || !t.includes('=')) continue;
            const i = t.indexOf('=');
            const k = t.slice(0, i).trim();
            let v = t.slice(i + 1).trim();
            if (
                v.length >= 2 &&
                ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
            ) {
                v = v.slice(1, -1);
            }
            if (v === '') continue;
            // Existing process.env values always win (tunnel overrides, shell env, etc.)
            if (process.env[k] !== undefined) continue;
            merged[k] = v;
        }
    }
    for (const [key, value] of Object.entries(merged)) {
        process.env[key] = value.replace(
            /\$\{([^}]+)\}/g,
            (_, name) => (merged[name] ?? process.env[name]) ?? value,
        );
    }
    return merged;
}