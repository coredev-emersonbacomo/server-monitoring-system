import { Link } from "react-router-dom";
import { ScrollText, X, Server, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityLogData } from "../hooks/useActivityLogs";
import {
    actionBadgeClass,
    formatDate,
    cleanDiscordMarkup,
    shortModel,
} from "../constants/logHelpers";

interface LogDetailModalProps {
    log: ActivityLogData | null;
    onClose: () => void;
}

export function LogDetailModal({ log, onClose }: LogDetailModalProps) {
    if (!log) return null;

    let parsed: Record<string, any> | null = null;
    if (log.details) {
        if (typeof log.details === "object") {
            parsed = log.details;
        } else if (typeof log.details === "string") {
            try {
                let obj = JSON.parse(log.details);
                if (typeof obj === "string") {
                    obj = JSON.parse(obj);
                }
                if (obj && typeof obj === "object") parsed = obj;
            } catch {
                /* empty */
            }
        }
    }

    const rawMessage =
        parsed?.message ??
        (typeof log.details === "string" ? log.details : null);
    const message =
        typeof rawMessage === "object" && rawMessage !== null
            ? JSON.stringify(rawMessage)
            : typeof rawMessage === "string"
            ? cleanDiscordMarkup(rawMessage)
            : rawMessage;
    const serverName = parsed?.server_name || parsed?.name;
    const isServerSubject = log.logable_type?.includes("Server");

    // Dynamic extraction of expiration field to prevent undefined values
    const expiresKey = parsed
        ? Object.keys(parsed).find((k) => k.toLowerCase().includes("expires"))
        : null;
    const expiresVal = expiresKey ? parsed?.[expiresKey] : null;

    const extraDetails = Object.entries(parsed || {}).filter(
        ([k]) =>
            ![
                "message",
                "old",
                "new",
                "before",
                "after",
                "server_name",
                "name",
                expiresKey,
            ]
                .filter(Boolean)
                .includes(k),
    );

    // Helper to render value for extra details (like expiry tokens)
    const renderExtraValue = (key: string, val: any) => {
        if (key.toLowerCase().includes("expires")) {
            const date = new Date(val);
            if (!isNaN(date.getTime())) {
                return date.toLocaleString();
            }
        }
        if (typeof val === "object" && val !== null) {
            return JSON.stringify(val);
        }
        return String(val);
    };

    const isGenerateInstallCommand =
        log.action.toLowerCase() === "generate installation command";

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
                    <div className="flex items-center gap-2">
                        <ScrollText className="size-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold text-foreground">
                            Log Entry #{log.id}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-muted transition-colors cursor-pointer"
                    >
                        <X className="size-4 text-muted-foreground" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                    {/* Top Action + Time Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                            className={cn(
                                "inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider border-0",
                                actionBadgeClass(log.action),
                            )}
                        >
                            {log.action}
                        </span>
                        <span className="text-xs text-muted-foreground font-mono">
                            {formatDate(log.created_at)}
                        </span>
                    </div>

                    {/* Prominent Message */}
                    {message && (
                        <div className="bg-muted/30 border border-border/80 rounded-xl p-4">
                            <p className="text-sm font-medium text-foreground leading-relaxed whitespace-pre-wrap">
                                {message}
                            </p>
                        </div>
                    )}

                    {/* Special Aesthetic Table for 'Generate Installation Command' */}
                    {isGenerateInstallCommand ? (
                        <div className="flex flex-col gap-2.5">
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                Provision Details
                            </p>
                            <div className="border border-border/85 rounded-xl overflow-hidden bg-card/60 shadow-sm">
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="bg-muted/30 border-b border-border/70 text-muted-foreground font-semibold">
                                            <th className="px-4 py-2.5">
                                                Server Name
                                            </th>
                                            <th className="px-4 py-2.5">
                                                Token Expiration
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr>
                                            <td className="px-4 py-3.5 font-medium">
                                                <Link
                                                    to={`/servers/${log.logable_id}`}
                                                    className="inline-flex items-center gap-1.5 text-primary hover:underline"
                                                >
                                                    <Server size={13} />
                                                    {serverName ||
                                                        log.logable_id}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3.5 font-mono">
                                                {expiresVal ? (
                                                    renderExtraValue(
                                                        "expires_at",
                                                        expiresVal,
                                                    )
                                                ) : (
                                                    <span className="text-muted-foreground/50">
                                                        —
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* User display below the custom table */}
                            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                                <span>Generated by:</span>
                                {log.user_id ? (
                                    <Link
                                        to={`/users/${log.user_id}`}
                                        className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
                                    >
                                        <User size={12} />
                                        {log.user}
                                    </Link>
                                ) : (
                                    <span className="font-semibold text-foreground">
                                        {log.user || "System"}
                                    </span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Subject / User Stacked Links */}
                            <div className="flex flex-col gap-4 pb-2">
                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        Subject
                                    </p>
                                    {isServerSubject ? (
                                        <div className="flex flex-col gap-1">
                                            <Link
                                                to={`/servers/${log.logable_id}`}
                                                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                                            >
                                                <Server
                                                    size={14}
                                                    className="shrink-0"
                                                />
                                                <span className="truncate">
                                                    {serverName ||
                                                        shortModel(
                                                            log.logable_type,
                                                        )}
                                                </span>
                                                <span className="text-[10px]">
                                                    →
                                                </span>
                                            </Link>
                                            <span className="text-xs text-muted-foreground font-mono pl-5">
                                                UUID: {log.logable_id}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1 text-sm font-medium text-foreground">
                                            <div className="inline-flex items-center gap-2">
                                                <Server
                                                    size={14}
                                                    className="shrink-0 text-muted-foreground"
                                                />
                                                <span className="truncate">
                                                    {shortModel(
                                                        log.logable_type,
                                                    )}
                                                </span>
                                            </div>
                                            <span className="text-xs text-muted-foreground font-mono pl-5">
                                                ID / UUID: {log.logable_id}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                        User
                                    </p>
                                    {log.user_id ? (
                                        <Link
                                            to={`/users/${log.user_id}`}
                                            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                                        >
                                            <User
                                                size={14}
                                                className="shrink-0"
                                            />
                                            <span className="truncate">
                                                {log.user ?? "Unknown"}
                                            </span>
                                            <span className="text-[10px]">
                                                →
                                            </span>
                                        </Link>
                                    ) : (
                                        <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                                            <User
                                                size={14}
                                                className="shrink-0 text-muted-foreground"
                                            />
                                            <span className="truncate">
                                                {log.user ?? "System"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Extra Details Grid */}
                            {extraDetails.length > 0 && (
                                <div className="flex flex-col gap-2 pt-4 border-t border-border/60">
                                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                        Extra Details
                                    </p>
                                    <div className="border border-border/80 rounded-lg overflow-hidden bg-card/40">
                                        <table className="w-full text-xs text-left">
                                            <tbody className="divide-y divide-border/60">
                                                {extraDetails.map(
                                                    ([key, val]) => (
                                                        <tr key={key}>
                                                            <td className="px-3 py-2.5 font-semibold text-muted-foreground capitalize bg-muted/10 w-2/5">
                                                                {key.replace(
                                                                    /_/g,
                                                                    " ",
                                                                )}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-foreground font-mono break-all whitespace-pre-wrap">
                                                                {renderExtraValue(
                                                                    key,
                                                                    val,
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ),
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* Collapsed Raw JSON Toggle */}
                    {parsed && (
                        <details className="mt-2 border-t border-border/60 pt-4">
                            <summary className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:text-foreground transition-colors select-none">
                                Raw JSON Payload
                            </summary>
                            <pre className="mt-2 text-[11px] bg-muted/40 border border-border/80 rounded-lg p-3 overflow-auto font-mono text-muted-foreground max-h-40 leading-normal">
                                {JSON.stringify(parsed, null, 2)}
                            </pre>
                        </details>
                    )}
                </div>
            </div>
        </div>
    );
}
