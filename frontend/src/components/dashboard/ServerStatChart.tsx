import { memo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { useChartZoomContext } from "@/hooks/useChartZoomContext";
import { useZoomHandlers } from "@/hooks/useZoomHandlers";
import type { StatPoint } from "@/types/stats";

const YEARLY_SPANS = new Set(["1Y", "3Y", "6Y", "9Y", "12Y"]);
const MONTHLY_SPANS = new Set(["3M", "6M"]);
const WEEKLY_SPANS = new Set(["1W", "1M"]);

function fmtTime(ts: number, timeSpan: string = "1H") {
    const d = new Date(ts);
    if (YEARLY_SPANS.has(timeSpan)) {
        return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    if (MONTHLY_SPANS.has(timeSpan) || WEEKLY_SPANS.has(timeSpan)) {
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    }
    if (timeSpan === "1D") {
        return d.toLocaleTimeString("en-US", { hour: "numeric", hour12: true });
    }
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

function fmtDatetime(ts: number, timeSpan: string = "1H") {
    const d = new Date(ts);
    if (YEARLY_SPANS.has(timeSpan)) {
        return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (MONTHLY_SPANS.has(timeSpan) || WEEKLY_SPANS.has(timeSpan)) {
        return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }
    return (
        d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
        " " +
        d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
    );
}

interface ServerStatChartProps {
    title: string;
    data?: StatPoint[];
    dataKey: keyof Omit<StatPoint, "timestamp">;
    color: string;
    unit?: string;
    yDomain?: [number | "auto", number | "auto"];
    timeSpan?: string;
}

export const ServerStatChart = memo(function ServerStatChart({
    title,
    data = [],
    dataKey,
    color,
    unit = "",
    yDomain = ["auto", "auto"],
    timeSpan = "1H",
}: ServerStatChartProps) {
    const { domain } = useChartZoomContext();
    const allTimestamps = data.map((d) => d.timestamp);
    const { containerRef } = useZoomHandlers(allTimestamps);

    const zoomedData = domain
        ? data.filter(
              (d) => d.timestamp >= domain[0] && d.timestamp <= domain[1],
          )
        : data;

    const windowSize = 100;
    const displayData =
        zoomedData.length <= windowSize
            ? zoomedData
            : zoomedData.slice(zoomedData.length - windowSize);

    const last = displayData[displayData.length - 1];
    const currentValue = last?.[dataKey];

    const tsValues = displayData.map((d) => d.timestamp);
    const xDomain: [number, number] =
        tsValues.length < 2
            ? [tsValues[0] - 60000, tsValues[0] + 60000]
            : [Math.min(...tsValues), Math.max(...tsValues)];

    return (
        <div className="rounded-lg border border-border/60 bg-card/40 p-3 py-4 flex flex-col gap-3">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {title}
            </span>
            <div
                ref={containerRef}
                className="touch-none select-none overflow-visible"
            >
                {displayData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                        <LineChart
                            data={displayData}
                            margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
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
                                contentStyle={{
                                    backgroundColor: "oklch(0.205 0 0)",
                                    border: "1px solid rgba(255,255,255,0.1)",
                                    borderRadius: "8px",
                                    fontSize: "11px",
                                    padding: "6px 10px",
                                    color: "rgba(255,255,255,0.85)",
                                }}
                                labelFormatter={(v) => fmtDatetime(Number(v), timeSpan)}
                                formatter={(v: unknown) => [
                                    `${Number(v).toFixed(2)}${unit}`,
                                    title,
                                ]}
                                cursor={{
                                    stroke: "rgba(255,255,255,0.07)",
                                    strokeWidth: 32,
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey={dataKey}
                                stroke={color}
                                dot={false}
                                strokeWidth={1.5}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center w-full" style={{ height: 110 }}>
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
                )}
            </div>
            <span className="text-xs text-muted-foreground">
                {currentValue !== undefined
                    ? `${currentValue.toFixed(2)}${unit}`
                    : `—${unit}`}
            </span>
        </div>
    );
});
