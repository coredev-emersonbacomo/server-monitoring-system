import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityLogData } from "../hooks/useActivityLogs";
import {
    COLUMNS,
    type SortableKey,
    actionBadgeClass,
    formatDate,
    getLogSubjectLabel,
} from "../constants/logHelpers";

function RowSkeleton() {
    return (
        <tr className="animate-pulse">
            <td className="px-4 py-3">
                <div className="h-4 w-32 bg-muted rounded" />
            </td>
            <td className="px-4 py-3">
                <div className="h-4 w-24 bg-muted rounded" />
            </td>
            <td className="px-4 py-3">
                <div className="h-4 w-20 bg-muted rounded" />
            </td>
            <td className="px-4 py-3">
                <div className="h-4 w-16 bg-muted rounded" />
            </td>
            <td className="px-4 py-3 text-right">
                <div className="h-4 w-10 bg-muted rounded ml-auto" />
            </td>
        </tr>
    );
}

interface LogTableProps {
    logs: ActivityLogData[];
    isLoading: boolean;
    emptyMessage: string;
    sortField: SortableKey;
    sortDir: "asc" | "desc";
    onSort: (key: SortableKey) => void;
    onSelectLog: (log: ActivityLogData) => void;
}

export function LogTable({
    logs,
    isLoading,
    emptyMessage,
    sortField,
    sortDir,
    onSort,
    onSelectLog,
}: LogTableProps) {
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
                                        <span
                                            className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border-0",
                                                actionBadgeClass(log.action),
                                            )}
                                        >
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
