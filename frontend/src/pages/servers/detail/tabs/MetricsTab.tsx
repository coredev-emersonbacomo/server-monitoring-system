import { Cpu, Link2, Trash2, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ServerStatChart } from "@/pages/dashboard/components/ServerStatChart";
import { cn } from "@/lib/utils";
import { useServerDetailContext } from "../context/ServerDetailContext";
import { CHARTS } from "../constants/charts";
import type { TimeSpan, TimeSpanArgs } from "../types";

export function MetricsTab({
    timeSpan,
    setTimeSpan,
    timeSpanArgs,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    customUnitStr,
    setCustomUnitStr,
    uuid,
}: {
    timeSpan: TimeSpan;
    setTimeSpan: (value: TimeSpan) => void;
    timeSpanArgs: TimeSpanArgs | undefined;
    customFrom: string;
    setCustomFrom: (value: string) => void;
    customTo: string;
    setCustomTo: (value: string) => void;
    customUnitStr: string;
    setCustomUnitStr: (value: string) => void;
    uuid: string;
}) {
    const { server, handleDeletePort } = useServerDetailContext();
    const queryClient = useQueryClient();

    return (
        <div className="flex flex-col gap-6 p-4 bg-card border border-t-0 border-border/60 rounded-b-lg">
            <div className="flex flex-col gap-6">
                <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Cpu size={16} className="text-primary" /> Top Processes
                    </h3>
                    {server?.processes && server.processes.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="text-muted-foreground border-b border-border/30">
                                        <th className="pb-2 font-medium">
                                            PID
                                        </th>
                                        <th className="pb-2 font-medium">
                                            Name
                                        </th>
                                        <th className="pb-2 font-medium text-right">
                                            CPU
                                        </th>
                                        <th className="pb-2 font-medium text-right">
                                            RAM
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {server.processes.map((p) => (
                                        <tr
                                            key={p.pid}
                                            className="hover:bg-muted/10"
                                        >
                                            <td className="py-2 text-muted-foreground">
                                                {p.pid}
                                            </td>
                                            <td
                                                className="py-2 font-medium text-foreground max-w-30 truncate"
                                                title={p.name}
                                            >
                                                {p.name}
                                            </td>
                                            <td className="py-2 text-right text-foreground">
                                                {p.cpu != null
                                                    ? `${p.cpu.toFixed(1)}%`
                                                    : "-"}
                                            </td>
                                            <td className="py-2 text-right text-foreground">
                                                {p.memory != null
                                                    ? `${p.memory.toFixed(1)} MB`
                                                    : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground py-4 text-center">
                            No processes reported.
                        </p>
                    )}
                </div>

                <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-sm">
                    <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                        <Link2 size={16} className="text-primary" /> Exposed
                        Ports
                    </h3>
                    {server?.ports && server.ports.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                    <tr className="text-muted-foreground border-b border-border/30">
                                        <th className="pb-2 font-medium">
                                            Port
                                        </th>
                                        <th className="pb-2 font-medium">
                                            Proto
                                        </th>
                                        <th className="pb-2 font-medium">
                                            Process
                                        </th>
                                        <th className="pb-2 font-medium text-right">
                                            State
                                        </th>
                                        <th className="pb-2 font-medium text-right">
                                            Ping
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {server.ports.map((p, idx: number) => (
                                        <tr
                                            key={idx}
                                            className="hover:bg-muted/10"
                                        >
                                            <td className="py-2 font-semibold text-foreground">
                                                {p.port}
                                            </td>
                                            <td className="py-2 text-muted-foreground uppercase">
                                                {p.protocol}
                                            </td>
                                            <td className="py-2 text-foreground font-medium">
                                                {p.process || "unknown"}
                                            </td>
                                            <td className="py-2 text-right flex items-center justify-end gap-1.5">
                                                <span
                                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${p.state === "listening" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}
                                                >
                                                    {p.state}
                                                </span>
                                                {p.id && (
                                                    <button
                                                        onClick={() =>
                                                            handleDeletePort(
                                                                p.id,
                                                            )
                                                        }
                                                        className="p-1 rounded text-red-500/80 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                        title="Delete tracked port"
                                                    >
                                                        <Trash2 size={12} />
                                                    </button>
                                                )}
                                            </td>
                                            <td className="py-2 text-right text-foreground">
                                                {p.ping_status === "offline"
                                                    ? "unreachable"
                                                    : p.ping_status === "online"
                                                      ? `${p.ping_time}ms`
                                                      : "-"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground py-4 text-center">
                            No open exposed ports.
                        </p>
                    )}
                </div>
            </div>

            <div className="pt-6 border-t border-border/60">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">
                        System Resources
                    </h3>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            icon={<RefreshCw size={13} />}
                            label="Refresh"
                            onClick={() =>
                                queryClient.invalidateQueries({
                                    queryKey: ["server", uuid],
                                })
                            }
                        />
                        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border border-border/50">
                            {(
                                [
                                    "1H",
                                    "1D",
                                    "1W",
                                    "1M",
                                    "3M",
                                    "6M",
                                ] as TimeSpan[]
                            ).map((span) => (
                                <button
                                    key={span}
                                    onClick={() => setTimeSpan(span)}
                                    className={cn(
                                        "px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer",
                                        timeSpan === span
                                            ? "bg-background text-foreground shadow-sm border border-border"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                    )}
                                >
                                    {span}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border border-border/50">
                            {(
                                [
                                    "1Y",
                                    "3Y",
                                    "6Y",
                                    "9Y",
                                    "12Y",
                                    "Custom",
                                ] as TimeSpan[]
                            ).map((span) => (
                                <button
                                    key={span}
                                    onClick={() => setTimeSpan(span)}
                                    className={cn(
                                        "px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer",
                                        timeSpan === span
                                            ? "bg-background text-foreground shadow-sm border border-border"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                    )}
                                >
                                    {span}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {timeSpan === "Custom" && (
                    <div className="flex flex-wrap items-center gap-4 mb-6 bg-muted/20 p-3 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground font-medium">
                                From:
                            </label>
                            <input
                                type="datetime-local"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className="bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 dark:[&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground font-medium">
                                Until:
                            </label>
                            <input
                                type="datetime-local"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className="bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 dark:[&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground font-medium">
                                Unit:
                            </label>
                            <select
                                value={customUnitStr}
                                onChange={(e) =>
                                    setCustomUnitStr(e.target.value)
                                }
                                className="bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                            >
                                <option value="auto">Auto</option>
                                <option
                                    value="1"
                                    disabled={(timeSpanArgs?.minUnit ?? 1) > 1}
                                >
                                    Minute
                                </option>
                                <option
                                    value="2"
                                    disabled={(timeSpanArgs?.minUnit ?? 1) > 2}
                                >
                                    Hour
                                </option>
                                <option
                                    value="3"
                                    disabled={(timeSpanArgs?.minUnit ?? 1) > 3}
                                >
                                    Day
                                </option>
                                <option
                                    value="4"
                                    disabled={(timeSpanArgs?.minUnit ?? 1) > 4}
                                >
                                    Week
                                </option>
                                <option
                                    value="5"
                                    disabled={(timeSpanArgs?.minUnit ?? 1) > 5}
                                >
                                    Month
                                </option>
                            </select>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 gap-6">
                    {CHARTS.map((cfg) => (
                        <ServerStatChart
                            key={cfg.dataKey}
                            title={cfg.title}
                            data={server?.stats || []}
                            dataKey={cfg.dataKey}
                            color={cfg.color}
                            unit={cfg.unit}
                            yDomain={cfg.yDomain}
                            timeSpan={timeSpan}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
