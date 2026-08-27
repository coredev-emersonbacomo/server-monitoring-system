import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import type { MetricKey } from "@/types/dashboard";

function fmtDatetime(ts: number, timeSpan: string): string {
    const d = new Date(ts);
    if (timeSpan === "day") {
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }
    if (timeSpan === "hour") {
        return (
            d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
            " " +
            d.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            })
        );
    }
    return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

interface ServerValue {
    serverName: string;
    value: number | null;
}

interface DataPointModalProps {
    timestamp: number;
    serverValues: ServerValue[];
    metric: MetricKey;
    unit: string;
    timeSpan: string;
    onClose: () => void;
}

export function DataPointModal({
    timestamp,
    serverValues,
    metric,
    unit,
    timeSpan,
    onClose,
}: DataPointModalProps) {
    const [search, setSearch] = useState("");

    const sorted = useMemo(() => {
        return [...serverValues].sort((a, b) => {
            if (a.value == null && b.value == null) return 0;
            if (a.value == null) return 1;
            if (b.value == null) return -1;
            return b.value - a.value;
        });
    }, [serverValues]);

    const filtered = useMemo(() => {
        if (!search.trim()) return sorted;
        const q = search.toLowerCase();
        return sorted.filter(
            (sv) =>
                sv.serverName.toLowerCase().includes(q) ||
                (sv.value != null && `${sv.value}${unit}`.includes(q)),
        );
    }, [sorted, search, unit]);

    const metricLabel = metric.charAt(0).toUpperCase() + metric.slice(1);

    return (
        <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
            <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden w-[calc(100vw-2rem)] sm:w-full max-h-[85vh]">
                <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3 border-b border-border">
                    <DialogTitle className="text-sm">
                        {metricLabel} — {fmtDatetime(timestamp, timeSpan)}
                    </DialogTitle>
                </DialogHeader>

                <div className="px-4 sm:px-6 py-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search server…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-8 py-2 text-sm bg-muted/40 border border-border/60 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch("")}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted cursor-pointer"
                            >
                                <X className="size-3.5 text-muted-foreground" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="max-h-[50vh] overflow-y-auto px-4 sm:px-6 pb-5">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border/60">
                                <th className="text-left py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Server
                                </th>
                                <th className="text-right py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Value
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/40">
                            {filtered.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={2}
                                        className="py-8 text-center text-xs text-muted-foreground"
                                    >
                                        No matching servers
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((sv) => (
                                    <tr
                                        key={sv.serverName}
                                        className="hover:bg-muted/30 transition-colors"
                                    >
                                        <td className="py-2 text-foreground font-medium truncate max-w-[60%]">
                                            {sv.serverName}
                                        </td>
                                        <td className="py-2 text-right text-foreground tabular-nums">
                                            {sv.value != null
                                                ? `${sv.value.toFixed(1)}${unit}`
                                                : "—"}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-4 sm:px-6 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground">
                    {filtered.length} of {sorted.length} servers
                </div>
            </DialogContent>
        </Dialog>
    );
}
