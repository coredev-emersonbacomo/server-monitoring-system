import { useMemo, useState } from "react";
import PageLayout from "@/components/PageLayout";
import IndexHeader from "@/components/IndexHeader";
import {
    ScrollText,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    X,
    Terminal,
    FileText,
    Server,
    User,
    Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
    useActivityLogs,
    useServerHealthLogs,
    useAgentLogs,
    useBillingLogs,
    type ActivityLogData,
} from "@/hooks/useActivityLogs";
import { Tab } from "@/components/ui/tab";
import { Link } from "react-router-dom";

// ─── Column config ────────────────────────────────────────────────────────────

type SortableKey = "logable_type" | "user" | "action" | "created_at";

interface Column {
    key: SortableKey;
    label: string;
}

const COLUMNS: Column[] = [
    { key: "created_at", label: "Timestamp" },
    { key: "logable_type", label: "Subject" },
    { key: "user", label: "User" },
    { key: "action", label: "Action" },
];

const ACTION_STYLES: Record<string, string> = {
    created: "text-emerald-400 bg-emerald-500/10",
    updated: "text-blue-400 bg-blue-500/10",
    deleted: "text-red-400 bg-red-500/10",
};

function actionBadgeClass(action: string): string {
    return (
        ACTION_STYLES[action.toLowerCase()] ??
        "text-muted-foreground bg-muted/40"
    );
}

function getLogSubjectLabel(log: ActivityLogData): string {
    if (log.details) {
        if (typeof log.details === "object") {
            const obj = log.details as Record<string, any>;
            if (obj && (obj.server_name || obj.name)) {
                return obj.server_name || obj.name;
            }
        } else if (typeof log.details === "string") {
            try {
                let obj = JSON.parse(log.details);
                if (typeof obj === "string") obj = JSON.parse(obj);
                if (obj && typeof obj === "object" && (obj.server_name || obj.name)) {
                    return obj.server_name || obj.name;
                }
            } catch {}
        }
    }
    return shortModel(log.logable_type);
}

function shortModel(fqcn: string): string {
    if (!fqcn) return "—";
    const parts = fqcn.split("\\");
    return parts[parts.length - 1];
}

function formatDate(value: string | null): string {
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

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function RowSkeleton() {
    return (
        <tr className="animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-3.5 w-20 bg-muted rounded" />
                </td>
            ))}
        </tr>
    );
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function LogDetailModal({
    log,
    onClose,
}: {
    log: ActivityLogData | null;
    onClose: () => void;
}) {
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
            } catch {}
        }
    }

    const rawMessage = parsed?.message ?? (typeof log.details === "string" ? log.details : null);
    const message = typeof rawMessage === "object" && rawMessage !== null ? JSON.stringify(rawMessage) : rawMessage;
    const serverName = parsed?.server_name || parsed?.name;
    const isServerSubject = log.logable_type?.includes("Server");

    // Dynamic extraction of expiration field to prevent undefined values
    const expiresKey = parsed ? Object.keys(parsed).find(k => k.toLowerCase().includes("expires")) : null;
    const expiresVal = expiresKey ? parsed?.[expiresKey] : null;

    const extraDetails = Object.entries(parsed || {}).filter(
        ([k]) => !["message", "old", "new", "before", "after", "server_name", "name", expiresKey].filter(Boolean).includes(k)
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

    const isGenerateInstallCommand = log.action.toLowerCase() === "generate installation command";

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
                            <p className="text-sm font-medium text-foreground leading-relaxed">
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
                                            <th className="px-4 py-2.5">Server Name</th>
                                            <th className="px-4 py-2.5">Token Expiration</th>
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
                                                    {serverName || log.logable_id}
                                                </Link>
                                            </td>
                                            <td className="px-4 py-3.5 font-mono">
                                                {expiresVal ? renderExtraValue("expires_at", expiresVal) : <span className="text-muted-foreground/50">—</span>}
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
                                    <span className="font-semibold text-foreground">{log.user || "System"}</span>
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
                                                <Server size={14} className="shrink-0" />
                                                <span className="truncate">{serverName || shortModel(log.logable_type)}</span>
                                                <span className="text-[10px]">→</span>
                                            </Link>
                                            <span className="text-xs text-muted-foreground font-mono pl-5">
                                                UUID: {log.logable_id}
                                            </span>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1 text-sm font-medium text-foreground">
                                            <div className="inline-flex items-center gap-2">
                                                <Server size={14} className="shrink-0 text-muted-foreground" />
                                                <span className="truncate">{shortModel(log.logable_type)}</span>
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
                                            <User size={14} className="shrink-0" />
                                            <span className="truncate">{log.user ?? "Unknown"}</span>
                                            <span className="text-[10px]">→</span>
                                        </Link>
                                    ) : (
                                        <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                                            <User size={14} className="shrink-0 text-muted-foreground" />
                                            <span className="truncate">{log.user ?? "System"}</span>
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
                                                {extraDetails.map(([key, val]) => (
                                                    <tr key={key}>
                                                        <td className="px-3 py-2.5 font-semibold text-muted-foreground capitalize bg-muted/10 w-2/5">
                                                            {key.replace(/_/g, " ")}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-foreground font-mono break-all whitespace-pre-wrap">
                                                            {renderExtraValue(key, val)}
                                                        </td>
                                                    </tr>
                                                ))}
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

// ─── Shared Log Table ──────────────────────────────────────────────────────────

function LogTable({
    logs,
    isLoading,
    emptyMessage,
    sortField,
    sortDir,
    onSort,
    onSelectLog,
}: {
    logs: ActivityLogData[];
    isLoading: boolean;
    emptyMessage: string;
    sortField: SortableKey;
    sortDir: "asc" | "desc";
    onSort: (key: SortableKey) => void;
    onSelectLog: (log: ActivityLogData) => void;
}) {
    return (
        <div className="rounded-b-xl border border-border/60 bg-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border/60 bg-muted/20">
                            {COLUMNS.map((col) => {
                                const isActive = sortField === col.key;
                                return (
                                    <th
                                        key={col.key}
                                        onClick={() => onSort(col.key)}
                                        className="px-4 py-3 text-left cursor-pointer select-none group"
                                    >
                                        <span
                                            className={cn(
                                                "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                                                isActive
                                                    ? "text-foreground"
                                                    : "text-muted-foreground group-hover:text-foreground",
                                            )}
                                        >
                                            {col.label}
                                            {isActive ? (
                                                sortDir === "asc" ? (
                                                    <ArrowUp size={12} />
                                                ) : (
                                                    <ArrowDown size={12} />
                                                )
                                            ) : (
                                                <ArrowUpDown
                                                    size={12}
                                                    className="opacity-0 group-hover:opacity-50 transition-opacity"
                                                />
                                            )}
                                        </span>
                                    </th>
                                );
                            })}
                            <th className="px-4 py-3 text-right">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Details
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <RowSkeleton key={i} />
                            ))
                        ) : logs.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={COLUMNS.length + 1}
                                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr
                                    key={log.id}
                                    className="hover:bg-muted/20 transition-colors"
                                >
                                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                        {formatDate(log.created_at)}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className="text-foreground font-medium">
                                            {getLogSubjectLabel(log)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-foreground">
                                        {log.user ?? "System"}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-foreground">
                                        <span className={cn(
                                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border-0",
                                            actionBadgeClass(log.action)
                                        )}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => onSelectLog(log)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
                                            title="View Details"
                                        >
                                            <span>View</span>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LogsPage() {
    const { data: activityLogs = [], isLoading: isLoadingActivity } = useActivityLogs();
    const { data: healthLogs = [], isLoading: isLoadingHealth } = useServerHealthLogs();
    const { data: agentLogs = [], isLoading: isLoadingAgent } = useAgentLogs();
    const { data: billingLogs = [], isLoading: isLoadingBilling } = useBillingLogs();

    const [sortField, setSortField] = useState<SortableKey>("created_at");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [selectedLog, setSelectedLog] = useState<ActivityLogData | null>(null);

    const handleSort = (key: SortableKey) => {
        if (sortField === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(key);
            setSortDir("asc");
        }
    };

    const sortFn = (list: ActivityLogData[]) => {
        const copy = [...list];
        copy.sort((a, b) => {
            const aVal = a[sortField] ?? "";
            const bVal = b[sortField] ?? "";

            if (sortField === "created_at") {
                const aTime = aVal ? new Date(aVal as string).getTime() : 0;
                const bTime = bVal ? new Date(bVal as string).getTime() : 0;
                const diff = aTime - bTime;
                return sortDir === "asc" ? diff : -diff;
            }

            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();
            if (aStr < bStr) return sortDir === "asc" ? -1 : 1;
            if (aStr > bStr) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
        return copy;
    };

    const sortedActivity = useMemo(() => sortFn(activityLogs), [activityLogs, sortField, sortDir]);
    const sortedHealth = useMemo(() => sortFn(healthLogs), [healthLogs, sortField, sortDir]);
    const sortedAgent = useMemo(() => sortFn(agentLogs), [agentLogs, sortField, sortDir]);
    const sortedBilling = useMemo(() => sortFn(billingLogs), [billingLogs, sortField, sortDir]);

    return (
        <PageLayout>
            <IndexHeader icon={ScrollText} title="Logs" />

            <main className="py-6 w-full flex-1 min-h-0">
                <Tab>
                    <Tab.Item icon={Terminal} title="Activity">
                        <LogTable
                            logs={sortedActivity}
                            isLoading={isLoadingActivity}
                            emptyMessage="No general activity logs recorded yet."
                            sortField={sortField}
                            sortDir={sortDir}
                            onSort={handleSort}
                            onSelectLog={setSelectedLog}
                        />
                    </Tab.Item>

                    <Tab.Item icon={Banknote} title="Billing">
                        <LogTable
                            logs={sortedBilling}
                            isLoading={isLoadingBilling}
                            emptyMessage="No billing, payment, or deduction logs recorded yet."
                            sortField={sortField}
                            sortDir={sortDir}
                            onSort={handleSort}
                            onSelectLog={setSelectedLog}
                        />
                    </Tab.Item>

                    <Tab.Item icon={Server} title="Server Health">
                        <LogTable
                            logs={sortedHealth}
                            isLoading={isLoadingHealth}
                            emptyMessage="No server health status logs recorded yet."
                            sortField={sortField}
                            sortDir={sortDir}
                            onSort={handleSort}
                            onSelectLog={setSelectedLog}
                        />
                    </Tab.Item>

                    <Tab.Item icon={FileText} title="Agent">
                        <LogTable
                            logs={sortedAgent}
                            isLoading={isLoadingAgent}
                            emptyMessage="No agent installation/update logs recorded yet."
                            sortField={sortField}
                            sortDir={sortDir}
                            onSort={handleSort}
                            onSelectLog={setSelectedLog}
                        />
                    </Tab.Item>
                </Tab>
            </main>

            <LogDetailModal
                log={selectedLog}
                onClose={() => setSelectedLog(null)}
            />
        </PageLayout>
    );
}
