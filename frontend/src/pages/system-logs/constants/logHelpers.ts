import type { ActivityLogData } from "../hooks/useActivityLogs";

export type SortableKey = "logable_type" | "user" | "action" | "created_at";

export interface Column {
    key: SortableKey;
    label: string;
}

export const COLUMNS: Column[] = [
    { key: "created_at", label: "Timestamp" },
    { key: "logable_type", label: "Subject" },
    { key: "user", label: "User" },
    { key: "action", label: "Action" },
];

export const ACTION_STYLES: Record<string, string> = {
    created: "text-emerald-400 bg-emerald-500/10",
    updated: "text-blue-400 bg-blue-500/10",
    deleted: "text-red-400 bg-red-500/10",
};

export function actionBadgeClass(action: string): string {
    return (
        ACTION_STYLES[action.toLowerCase()] ??
        "text-muted-foreground bg-muted/40"
    );
}

export function getLogSubjectLabel(log: ActivityLogData): string {
    if (log.details) {
        if (typeof log.details === "object") {
            const obj = log.details as Record<string, unknown>;
            if (obj && (obj.server_name || obj.name)) {
                return (obj.server_name || obj.name) as string;
            }
        } else if (typeof log.details === "string") {
            try {
                let obj = JSON.parse(log.details);
                if (typeof obj === "string") obj = JSON.parse(obj);
                if (
                    obj &&
                    typeof obj === "object" &&
                    (obj.server_name || obj.name)
                ) {
                    return obj.server_name || obj.name;
                }
            } catch { /* ignore parse errors */ }
        }
    }
    return shortModel(log.logable_type);
}

export function shortModel(fqcn: string | null | undefined): string {
    if (!fqcn) return "—";
    const parts = fqcn.split("\\");
    return parts[parts.length - 1];
}

export function formatDate(value: string | null): string {
    if (!value) return "—";
    const d = new Date(value);
    return d.toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function cleanDiscordMarkup(text: string): string {
    if (!text) return "";
    let cleaned = text;

    // Extract embed title if present
    const titleMatch = cleaned.match(/<discord-embed-title>(.*?)<\/discord-embed-title>/i);
    const title = titleMatch ? titleMatch[1].trim() : "";

    // Strip out all tags
    cleaned = cleaned.replace(/<discord-embed-title>.*?<\/discord-embed-title>/gi, "");
    cleaned = cleaned.replace(/<discord-embed>/gi, "");
    cleaned = cleaned.replace(/<\/discord-embed>/gi, "");
    cleaned = cleaned.replace(/<discord-button[^>]*>.*?<\/discord-button>/gi, "");
    cleaned = cleaned.replace(/<@&\d+>/g, "");

    // Format timestamps <t:1786943538:f> into readable date
    cleaned = cleaned.replace(/<t:(\d+)(?::[a-zA-Z])?>/g, (_, ts) => {
        try {
            const date = new Date(parseInt(ts, 10) * 1000);
            return date.toLocaleString();
        } catch {
            return ts;
        }
    });

    cleaned = cleaned.trim();
    if (title) {
        return `${title}\n${cleaned}`;
    }
    return cleaned;
}
