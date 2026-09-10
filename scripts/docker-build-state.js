// Shared staleness check for the dev image: `npm run docker`, `npm run ngrok`
// and `npm run ngrok:build` all `docker compose up` the same dev target, and
// plain `up` never rebuilds a stale image. Hash the build inputs; a mismatch
// (or no recorded hash) means `--build`, otherwise plain `up -d` keeps the
// running stack untouched. Config/env drift needs no check — compose itself
// recreates containers whose config changed on every `up`.
import crypto from "crypto";
import fs from "fs";
import path from "path";

// Everything the dev target consumes at BUILD time (Dockerfile dev stage +
// compose build config). Source edits need no rebuild (bind mount).
const BUILD_INPUTS = [
    "Dockerfile",
    "compose.yaml",
    "composer.json",
    "composer.lock",
    "package.json",
    "package-lock.json",
    "frontend/package.json",
    "docs/package.json",
    "docker/entrypoint.sh",
    "docker/frankenphp-Caddyfile",
];

const STATE_FILE = ".docker-build-hash";

// Base-image digest bumps (frankenphp:1-php8.5 etc.) are invisible to this
// hash — pass `rebuild` to force a build when you want a fresh pull.
export function buildInputsHash(root) {
    const h = crypto.createHash("sha256");
    for (const rel of BUILD_INPUTS) {
        // Names included so a deleted input also changes the hash.
        try {
            h.update(rel + "\0" + fs.readFileSync(path.join(root, rel)));
        } catch {
            h.update(rel + "\0MISSING");
        }
        h.update("\0");
    }
    return h.digest("hex");
}

export function isDockerStale(root) {
    let recorded = "";
    try {
        recorded = fs.readFileSync(path.join(root, STATE_FILE), "utf8").trim();
    } catch {
        return true;
    }
    return recorded !== buildInputsHash(root);
}

export function markDockerFresh(root) {
    try {
        fs.writeFileSync(path.join(root, STATE_FILE), buildInputsHash(root) + "\n");
    } catch {}
}
