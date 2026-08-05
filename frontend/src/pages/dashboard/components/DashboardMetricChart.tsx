import { useState, useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { useDashboardUsage } from "../hooks/useDashboardUsage";
import { useServers } from "@/hooks/useServers";
import type { MetricKey, TimeUnit, UsageScope } from "@/types/dashboard";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQueryClient } from "@tanstack/react-query";

type TimeSpan = "1H" | "1D" | "1W";

const TIME_SPAN_TO_UNIT: Record<TimeSpan, TimeUnit> = {
    "1H": "minute",
    "1D": "hour",
    "1W": "day",
};

// Distinct colors for up to ~12 servers
const SERIES_COLORS = [
    "#8b5cf6",
    "#10b981",
    "#f59e0b",
    "#3b82f6",
    "#f43f5e",
    "#06b6d4",
    "#a78bfa",
    "#34d399",
    "#fbbf24",
    "#60a5fa",
    "#fb7185",
    "#22d3ee",
];

function fmtTime(ts: number, timeSpan: TimeSpan): string {
    const d = new Date(ts);
    if (timeSpan === "1W") {
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    }
    if (timeSpan === "1D") {
        return d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
    }
    return d.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

function fmtDatetime(ts: number, timeSpan: TimeSpan): string {
    const d = new Date(ts);
    if (timeSpan === "1W") {
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    }
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

interface MergedPoint {
    timestamp: number;
    [serverUuid: string]: number | null;
}

interface DashboardMetricChartInnerProps {
    metric: MetricKey;
    unit?: string;
    yDomain?: [number | "auto", number | "auto"];
    timeSpan: TimeSpan;
    scope?: UsageScope;
    serverUuid?: string;
    nameFilter?: string;
}

function DashboardMetricChartInner({
    metric,
    unit = "",
    yDomain = ["auto", "auto"],
    timeSpan,
    scope = "all",
    serverUuid,
    nameFilter,
}: DashboardMetricChartInnerProps) {
    const apiUnit = TIME_SPAN_TO_UNIT[timeSpan];

    const { data, isLoading } = useDashboardUsage(
        metric,
        apiUnit,
        scope,
        serverUuid,
    );

    const allSeries = useMemo(() => {
        if (!data?.pages?.length) return [];
        return data.pages[0].series;
    }, [data]);

    const series = useMemo(() => {
        if (!allSeries.length) return [];
        const q = nameFilter?.trim().toLowerCase();
        if (!q) return allSeries;
        return allSeries.filter((s) =>
            s.server_name.toLowerCase().includes(q),
        );
    }, [allSeries, nameFilter]);

    // Merge all series into [{timestamp, uuid1: val, uuid2: val, ...}] via a
    // Map-keyed timestamp lookup instead of O(points²) nested finds
    const mergedData = useMemo((): MergedPoint[] => {
        if (!series.length) return [];
        const tsMap = new Map<number, MergedPoint>();
        for (const s of series) {
            for (const p of s.points) {
                let pt = tsMap.get(p.timestamp);
                if (!pt) {
                    pt = { timestamp: p.timestamp };
                    tsMap.set(p.timestamp, pt);
                }
                pt[s.server_uuid] = p.value ?? null;
            }
        }
        return [...tsMap.values()].sort((a, b) => a.timestamp - b.timestamp);
    }, [series]);

    const tsValues = mergedData.map((d) => d.timestamp);
    const xDomain: [number, number] =
        tsValues.length < 2
            ? [(tsValues[0] ?? 0) - 60000, (tsValues[0] ?? 0) + 60000]
            : [Math.min(...tsValues), Math.max(...tsValues)];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center w-full h-50">
                <span className="text-xs text-muted-foreground animate-pulse">
                    Loading…
                </span>
            </div>
        );
    }

    if (!series.length || !mergedData.length) {
        return (
            <div
                className="flex items-center justify-center w-full"
                style={{ height: 200 }}
            >
                <div className="flex flex-col items-center gap-2">
                    <svg
                        width="56"
                        height="36"
                        viewBox="0 0 56 36"
                        fill="none"
                        className="text-border"
                    >
                        <path
                            d="M4 32 L14 22 L24 28 L34 12 L44 18 L52 6"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            opacity="0.7"
                        />
                        <circle
                            cx="52"
                            cy="6"
                            r="2.5"
                            fill="currentColor"
                            opacity="0.55"
                        />
                    </svg>
                    <span className="text-xs text-muted-foreground/50">
                        No data
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <div>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart
                        data={mergedData}
                        margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                        syncId={`dashboard-${metric}`}
                    >
                        <CartesianGrid
                            stroke="var(--color-border)"
                            strokeOpacity={0.5}
                            vertical={false}
                        />
                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            scale="time"
                            domain={xDomain}
                            tickFormatter={(ts) => fmtTime(ts, timeSpan)}
                            tick={{
                                fontSize: 10,
                                fill: "var(--color-muted-foreground)",
                            }}
                            tickLine={false}
                            axisLine={false}
                            minTickGap={30}
                        />
                        <YAxis
                            domain={yDomain}
                            tick={{
                                fontSize: 10,
                                fill: "var(--color-muted-foreground)",
                            }}
                            tickLine={false}
                            axisLine={false}
                            width={34}
                            tickFormatter={(v: number) => `${v}${unit}`}
                        />
                        <Tooltip
                            isAnimationActive={false}
                            contentStyle={{
                                backgroundColor: "oklch(0.205 0 0)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "8px",
                                fontSize: "11px",
                                padding: "6px 10px",
                                color: "rgba(255,255,255,0.85)",
                                maxHeight: 200,
                                overflowY: "auto",
                            }}
                            labelFormatter={(v) =>
                                fmtDatetime(Number(v), timeSpan)
                            }
                            formatter={(v: unknown, name: unknown) => {
                                const s = series.find(
                                    (s) => s.server_uuid === name,
                                );
                                return [
                                    `${Number(v).toFixed(1)}${unit}`,
                                    s?.server_name ?? String(name),
                                ];
                            }}
                            cursor={{
                                stroke: "rgba(255,255,255,0.07)",
                                strokeWidth: 32,
                            }}
                        />
                        {series.map((s, i) => (
                            <Line
                                key={s.server_uuid}
                                type="monotone"
                                dataKey={s.server_uuid}
                                stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                                dot={false}
                                strokeWidth={1.5}
                                isAnimationActive={false}
                                connectNulls
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Server legend */}
            {(series.length > 1 || scope !== "all") && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 px-1">
                    {series.map((s, i) => (
                        <span
                            key={s.server_uuid}
                            className="flex items-center gap-1.5 text-[10px] text-muted-foreground"
                        >
                            <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{
                                    backgroundColor:
                                        SERIES_COLORS[i % SERIES_COLORS.length],
                                }}
                            />
                            {s.server_name}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}

interface DashboardMetricChartProps {
    title: string;
    metric: MetricKey;
    unit?: string;
    yDomain?: [number | "auto", number | "auto"];
    timeSpan: TimeSpan;
    scope?: UsageScope;
    serverUuid?: string;
    nameFilter?: string;
}

export function DashboardMetricChart({
    title,
    metric,
    unit,
    yDomain,
    timeSpan,
    scope,
    serverUuid,
    nameFilter,
}: DashboardMetricChartProps) {
    return (
        <div className="rounded-lg border border-border/60 bg-card/40 p-3 py-4 flex flex-col gap-3">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {title}
            </span>
            <DashboardMetricChartInner
                metric={metric}
                unit={unit}
                yDomain={yDomain}
                timeSpan={timeSpan}
                scope={scope}
                serverUuid={serverUuid}
                nameFilter={nameFilter}
            />
        </div>
    );
}

// ─── Container with view/time-span selectors ─────────────────────────────────

const CHARTS: {
    title: string;
    metric: MetricKey;
    unit: string;
    yDomain?: [number | "auto", number | "auto"];
}[] = [
    {
        title: "CPU",
        metric: "cpu",
        unit: "%",
        yDomain: [0, 100],
    },
    {
        title: "Memory",
        metric: "memory",
        unit: "%",
        yDomain: [0, 100],
    },
    {
        title: "Disk",
        metric: "disk",
        unit: "%",
        yDomain: [0, 100],
    },
];

const TIME_SPANS: TimeSpan[] = ["1H", "1D", "1W"];

type ChartView = "overview" | "perServer";

function Segmented<T extends string>({
    options,
    value,
    onChange,
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
}) {
    return (
        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border border-border/50">
            {options.map((o) => (
                <button
                    key={o.value}
                    onClick={() => onChange(o.value)}
                    className={cn(
                        "px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer",
                        value === o.value
                            ? "bg-background text-foreground shadow-sm border border-border"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                    )}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}

export function DashboardChartsSection() {
    const [timeSpan, setTimeSpan] = useState<TimeSpan>("1H");
    const [view, setView] = useState<ChartView>("overview");
    const [metric, setMetric] = useState<MetricKey>("cpu");
    const [selected, setSelected] = useState<string[]>([]);
    const [search, setSearch] = useState("");
    const queryClient = useQueryClient();
    const { data: serversData } = useServers();
    const servers = serversData ?? [];

    const q = search.trim().toLowerCase();
    const filteredServers = q
        ? servers.filter((s) => s.name.toLowerCase().includes(q))
        : servers;

    // Empty selection = show every server; checked servers = compare view
    const isAll = selected.length === 0;
    const compareUuids = isAll ? undefined : selected.join(",");

    const toggleServer = (uuid: string) => {
        setSelected((prev) =>
            prev.includes(uuid)
                ? prev.filter((u) => u !== uuid)
                : [...prev, uuid],
        );
    };

    return (
        <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2 flex-wrap">
                    <Segmented<ChartView>
                        options={[
                            { value: "overview", label: "Overview (Avg)" },
                            { value: "perServer", label: "Per Server" },
                        ]}
                        value={view}
                        onChange={setView}
                    />
                    <Segmented<TimeSpan>
                        options={TIME_SPANS.map((s) => ({
                            value: s,
                            label: s,
                        }))}
                        value={timeSpan}
                        onChange={setTimeSpan}
                    />
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    icon={<RefreshCw size={13} />}
                    label="Refresh"
                    onClick={() =>
                        queryClient.invalidateQueries({
                            queryKey: ["dashboard", "usage"],
                        })
                    }
                />
            </div>

            {view === "perServer" && (
                <div className="flex flex-wrap items-start gap-2 mb-4">
                    <div className="flex flex-col gap-2">
                        <Segmented<MetricKey>
                            options={CHARTS.map((c) => ({
                                value: c.metric,
                                label: c.title,
                            }))}
                            value={metric}
                            onChange={setMetric}
                        />
                        <Input
                            placeholder="Search servers…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="h-8 w-56 text-xs"
                        />
                    </div>
                    <div className="flex flex-col border border-border/60 rounded-lg bg-card/40 p-2 max-h-52 overflow-y-auto min-w-56 flex-1 max-w-xs gap-0.5">
                        <label className="flex items-center gap-2 text-xs cursor-pointer py-0.5">
                            <input
                                type="checkbox"
                                checked={isAll}
                                onClick={() => setSelected([])}
                                onChange={() => {}}
                                className="accent-violet-500 cursor-pointer"
                            />
                            All servers
                        </label>
                        <div className="h-px bg-border/60 my-1" />
                        {filteredServers.map((s) => (
                            <label
                                key={s.uuid}
                                className="flex items-center gap-2 text-xs cursor-pointer py-0.5"
                            >
                                <input
                                    type="checkbox"
                                    checked={selected.includes(s.uuid)}
                                    onChange={() => toggleServer(s.uuid)}
                                    className="accent-violet-500 cursor-pointer"
                                />
                                <span className="truncate">{s.name}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {view === "overview" ? (
                    CHARTS.map((cfg) => (
                        <DashboardMetricChart
                            key={cfg.metric}
                            title={cfg.title}
                            metric={cfg.metric}
                            unit={cfg.unit}
                            yDomain={cfg.yDomain}
                            timeSpan={timeSpan}
                            scope="avg"
                        />
                    ))
                ) : (() => {
                    const cfg = CHARTS.find((c) => c.metric === metric)!;
                    return (
                        <DashboardMetricChart
                            key={cfg.metric}
                            title={cfg.title}
                            metric={cfg.metric}
                            unit={cfg.unit}
                            yDomain={cfg.yDomain}
                            timeSpan={timeSpan}
                            scope={isAll ? "all" : "server"}
                            serverUuid={compareUuids}
                            nameFilter={isAll ? q || undefined : undefined}
                        />
                    );
                })()}
            </div>
        </div>
    );
}
