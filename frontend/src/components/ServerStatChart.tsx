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
import type { StatPoint } from "../data/mockDashboard";
import { useChartZoomContext } from "@/hooks/useChartZoomContext";
import { useZoomHandlers } from "@/hooks/useZoomHandlers";

function fmtTime(ts: number) {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

function fmtDatetime(ts: number) {
    const d = new Date(ts);
    return (
        d.toLocaleDateString("en", { month: "short", day: "numeric" }) +
        " " +
        fmtTime(ts)
    );
}

interface ServerStatChartProps {
    title: string;
    data: StatPoint[];
    dataKey: keyof Omit<StatPoint, "timestamp">;
    color: string;
    unit?: string;
    yDomain?: [number | "auto", number | "auto"];
}

export const ServerStatChart = memo(function ServerStatChart({
    title,
    data,
    dataKey,
    color,
    unit = "",
    yDomain = ["auto", "auto"],
}: ServerStatChartProps) {
    const { domain } = useChartZoomContext();
    const allTimestamps = data.map((d) => d.timestamp);
    const { onWheel, onTouchStart, onTouchMove } =
        useZoomHandlers(allTimestamps);

    const displayData = domain
        ? data.filter(
              (d) => d.timestamp >= domain[0] && d.timestamp <= domain[1],
          )
        : data;

    return (
        <div className="rounded-lg border border-border/60 bg-card/40 p-3 py-4 flex flex-col gap-1">
            <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                {title}
            </span>
            <div
                className="touch-none select-none"
                onWheel={onWheel}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
            >
                <ResponsiveContainer width="100%" height={110}>
                    <LineChart
                        data={displayData}
                        margin={{ top: 4, right: 6, left: -10, bottom: 0 }}
                    >
                        <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="rgba(255,255,255,0.04)"
                            vertical={false}
                        />
                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            scale="time"
                            domain={["dataMin", "dataMax"]}
                            tickFormatter={fmtTime}
                            tick={{
                                fontSize: 9,
                                fill: "rgba(255,255,255,0.35)",
                            }}
                            // tickLine={false}
                            // axisLine={false}
                            minTickGap={50}
                        />
                        <YAxis
                            domain={yDomain}
                            tick={{
                                fontSize: 9,
                                fill: "rgba(255,255,255,0.35)",
                            }}
                            // tickLine={false}
                            // axisLine={false}
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
                            labelFormatter={(v) => fmtDatetime(Number(v))}
                            formatter={(v: any) => [
                                `${Number(v).toFixed(2)}${unit}`,
                                title,
                            ]}
                            cursor={{
                                stroke: "rgba(255,255,255,0.15)",
                                strokeWidth: 1,
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
            </div>
            <span className="text-xs text-muted-foreground">
                {displayData[displayData.length - 1][dataKey].toFixed(2)}
                {unit}
            </span>
        </div>
    );
});
