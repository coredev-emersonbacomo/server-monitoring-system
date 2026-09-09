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

export function getLogSubjectInfo(log: ActivityLogData): { title: string; subtitle?: string } {
    const model = shortModel(log.logable_type);
    let extractedName: string | undefined;

    if (log.details) {
        let obj: Record<string, unknown> | null = null;
        if (typeof log.details === "object" && log.details !== null) {
            obj = log.details as Record<string, unknown>;
        } else if (typeof log.details === "string") {
            try {
                let parsed = JSON.parse(log.details);
                if (typeof parsed === "string") parsed = JSON.parse(parsed);
                if (typeof parsed === "object" && parsed !== null) {
                    obj = parsed as Record<string, unknown>;
                }
            } catch {
                /* ignore json parse */
            }
        }

        if (obj) {
            if (typeof obj.server_name === "string" && obj.server_name) {
                extractedName = obj.server_name;
            } else if (typeof obj.client_name === "string" && obj.client_name) {
                extractedName = obj.client_name;
            } else if (typeof obj.name === "string" && obj.name) {
                extractedName = obj.name;
            } else if (typeof obj.message === "string" && obj.message) {
                // e.g. "Updated client profile details for coreDev" or "Added secop to coreDev"
                const match =
                    obj.message.match(/(?:for|to|from|on)\s+([A-Za-z0-9_.\s-]+)$/i) ||
                    obj.message.match(/`([^`]+)`/);
                if (match?.[1]) {
                    extractedName = match[1].trim();
                }
            }
        }
    }

    if (extractedName && extractedName !== model) {
        return {
            title: extractedName,
            subtitle: model !== "—" ? model : undefined,
        };
    }

    return {
        title: model !== "—" ? model : "System",
        subtitle: undefined,
    };
}

export function getLogSubjectLabel(log: ActivityLogData): string {
    const info = getLogSubjectInfo(log);
    return info.subtitle ? `${info.title} (${info.subtitle})` : info.title;
}

export function shortModel(fqcn: string | null | undefined): string {
    if (!fqcn) return "—";
    const parts = fqcn.split("\\");
    return parts[parts.length - 1];
}

export function formatDate(value: string | null): string {
    if (!value) return "—";
    const normalized = value.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(value) ? value : `${value}Z`;
    const d = new Date(normalized);
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
