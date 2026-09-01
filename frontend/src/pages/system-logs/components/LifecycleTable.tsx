import { usePaginatedTable } from "../hooks/usePaginatedTable";
import type { AgentLifecycleLogData } from "../hooks/useAuditLogs";
import { cn } from "@/lib/utils";
import { time } from "@/lib/time";
import { ServerLink } from "./ServerLink";
import { PaginationControls } from "@/components/PaginationControls";

function RowSkeleton() {
    return (
        <tr className="animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
                <td key={i} className="px-4 py-3">
                    <div className="h-4 w-28 bg-muted rounded" />
                </td>
            ))}
        </tr>
    );
}

const eventClass: Record<string, string> = {
    started: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    stopping: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    stopped: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    unexpectedly_disconnected:
        "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

interface LifecycleTableProps {
    id?: string;
    url: string;
    params?: Record<string, string | undefined>;
    emptyMessage: string;
    onSelect: (log: AgentLifecycleLogData) => void;
}

export function LifecycleTable({
    id,
    url,
    params = {},
    emptyMessage,
    onSelect,
}: LifecycleTableProps) {
    const {
        data: logs,
        meta,
        isLoading,
        setParams,
        goFirst,
        goPrev,
        goNext,
        goLast,
        goToPage,
    } = usePaginatedTable<AgentLifecycleLogData>(url, params, { id });

    return (
        <div className="bg-card overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border/60 bg-muted/20 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            <th className="px-4 py-3 text-left">Time</th>
                            <th className="px-4 py-3 text-left">Server</th>
                            <th className="px-4 py-3 text-left">Event</th>
                            <th className="px-4 py-3 text-right">Details</th>
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
                                    colSpan={4}
                                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => (
                                <tr
                                    key={log.uuid}
                                    className="hover:bg-muted/20 transition-colors cursor-pointer"
                                    onClick={() => onSelect(log)}
                                >
                                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                        {time(log.occurred_at)}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <ServerLink
                                            serverUuid={log.server_uuid}
                                            serverName={log.server_name}
                                            agentServers={log.agent_servers}
                                        />
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span
                                            className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                                eventClass[log.event_type] ??
                                                    "bg-muted text-muted-foreground",
                                            )}
                                        >
                                            {log.event_type.replace(/_/g, " ")}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelect(log);
                                            }}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
                                        >
                                            View
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="px-4 pb-4">
                <PaginationControls
                    meta={meta}
                    onFirst={goFirst}
                    onPrev={goPrev}
                    onNext={goNext}
                    onLast={goLast}
                    onPage={goToPage}
                    perPage={meta.perPage}
                    onPerPageChange={(size) =>
                        setParams({
                            per_page: String(size),
                            page: null,
                            cursor: null,
                            previous_cursor: null,
                        })
                    }
                />
            </div>
        </div>
    );
}
