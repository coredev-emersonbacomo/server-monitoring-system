import { useEffect, useState, type ReactNode } from "react";
import { Download, Loader2 } from "lucide-react";

type State =
    | { status: "loading" }
    | { status: "ready"; name: string; url: string }
    | { status: "error" };

const REDIS_MSYS_ASSET = /^Redis-.*-Windows-x64-msys2\.zip$/;
const GITHUB_LATEST =
    "https://api.github.com/repos/redis-windows/redis-windows/releases/latest";
const RELEASES_FALLBACK =
    "https://github.com/redis-windows/redis-windows/releases/latest";

// A single in-flight promise so the component (which the docs page renders
// twice — visible + hidden TOC-parse copy) never fires duplicate API calls.
let latestPromise: Promise<{ name: string; url: string }> | null = null;

function fetchLatest(): Promise<{ name: string; url: string }> {
    if (latestPromise) return latestPromise;
    latestPromise = fetch(GITHUB_LATEST, {
        headers: { Accept: "application/vnd.github+json" },
    })
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return res.json();
        })
        .then((release: {
            tag_name: string;
            assets: { name: string; browser_download_url: string }[];
        }) => {
            const asset = release.assets?.find((a) => REDIS_MSYS_ASSET.test(a.name));
            if (!asset) throw new Error("no msys2 asset");
            return { name: asset.name, url: asset.browser_download_url };
        });
    return latestPromise;
}

const buttonClass =
    "inline-flex items-center gap-2 rounded-lg border border-border/60 bg-card px-4 py-2.5 text-sm font-medium text-foreground transition-all hover:bg-muted/50 hover:border-border cursor-pointer";

export default function RedisDownloadLink({
    fallbackLabel = "Open redis-windows releases",
}: { fallbackLabel?: string }): ReactNode {
    const [state, setState] = useState<State>({ status: "loading" });

    useEffect(() => {
        setState({ status: "loading" });
        fetchLatest()
            .then(
                ({ name, url }) => setState({ status: "ready", name, url }),
                () => setState({ status: "error" }),
            )
            .catch(() => setState({ status: "error" }));
    }, []);

    if (state.status === "ready") {
        return (
            <a href={state.url} download target="_blank" rel="noreferrer" className={buttonClass}>
                <Download className="size-4" />
                Download {state.name}
            </a>
        );
    }

    if (state.status === "error") {
        return (
            <a href={RELEASES_FALLBACK} target="_blank" rel="noreferrer" className={buttonClass}>
                <Download className="size-4" />
                {fallbackLabel}
            </a>
        );
    }

    return (
        <span className={`${buttonClass} pointer-events-none opacity-70`}>
            <Loader2 className="size-4 animate-spin" />
            Resolving latest…
        </span>
    );
}
