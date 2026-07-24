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
import { useChartZoomContext } from "@/hooks/useChartZoomContext";
import { useZoomHandlers } from "@/hooks/useZoomHandlers";
import { useDashboardUsage } from "@/hooks/useDashboardUsage";
import type { MetricKey, TimeUnit } from "@/types/dashboard";

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
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
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
    title: string;
    metric: MetricKey;
    unit?: string;
    yDomain?: [number | "auto", number | "auto"];
    timeSpan: TimeSpan;
}

function DashboardMetricChartInner({
    title,
    metric,
    unit = "",
    yDomain = ["auto", "auto"],
    timeSpan,
}: DashboardMetricChartInnerProps) {
    const apiUnit = TIME_SPAN_TO_UNIT[timeSpan];

    const { data, isLoading } = useDashboardUsage(metric, apiUnit);

    const series = useMemo(() => {
        if (!data?.pages?.length) return [];
        const latestPage = data.pages[0];
        return latestPage.series;
    }, [data]);

    // Merge all series into [{timestamp, uuid1: val, uuid2: val, ...}]
    const mergedData = useMemo((): MergedPoint[] => {
        if (!series.length) return [];
        const tsSet = new Set<number>();
        series.forEach((s) => s.points.forEach((p) => tsSet.add(p.timestamp)));
        const sorted = [...tsSet].sort((a, b) => a - b);
        return sorted.map((ts) => {
            const point: MergedPoint = { timestamp: ts };
            series.forEach((s) => {
                const match = s.points.find((p) => p.timestamp === ts);
                point[s.server_uuid] = match?.value ?? null;
            });
            return point;
        });
    }, [series]);

    const tsValues = mergedData.map((d) => d.timestamp);
    const xDomain: [number, number] =
        tsValues.length < 2
            ? [(tsValues[0] ?? 0) - 60000, (tsValues[0] ?? 0) + 60000]
            : [Math.min(...tsValues), Math.max(...tsValues)];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center w-full h-[200px]">
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
            <div >
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
                            formatter={(v: unknown, name: string) => {
                                const s = series.find(
                                    (s) => s.server_uuid === name,
                                );
                                return [
                                    `${Number(v).toFixed(1)}${unit}`,
                                    s?.server_name ?? name,
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
            {series.length > 1 && (
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
}

export function DashboardMetricChart({
    title,
    metric,
    unit,
    yDomain,
    timeSpan,
}: DashboardMetricChartProps) {
    return (
        <div className="rounded-lg border border-border/60 bg-card/40 p-3 py-4 flex flex-col gap-3">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {title}
            </span>
            <DashboardMetricChartInner
                title={title}
                metric={metric}
                unit={unit}
                yDomain={yDomain}
                timeSpan={timeSpan}
            />
        </div>
    );
}

// ─── Container with time-span selector ───────────────────────────────────────

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

export function DashboardChartsSection() {
    const [timeSpan, setTimeSpan] = useState<TimeSpan>("1H");

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border border-border/50">
                    {TIME_SPANS.map((span) => (
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

            <div className="grid grid-cols-1 gap-6">
                {CHARTS.map((cfg) => (
                    <DashboardMetricChart
                        key={cfg.metric}
                        title={cfg.title}
                        metric={cfg.metric}
                        unit={cfg.unit}
                        yDomain={cfg.yDomain}
                        timeSpan={timeSpan}
                    />
                ))}
            </div>
        </div>
    );
}
