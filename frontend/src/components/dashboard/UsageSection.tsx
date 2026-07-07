import {
    useState,
    useMemo,
    useCallback,
    useRef,
    useEffect,
    useLayoutEffect,
} from "react";
import { LineChart, Line, XAxis, CartesianGrid, Tooltip } from "recharts";
import type { TooltipContentProps, XAxisTickContentProps } from "recharts";
import { useDashboardUsage } from "@/hooks/useDashboardUsage";
import type { UsageSeries, TimeUnit, MetricKey } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
    Maximize2,
    Minimize2,
    Activity,
    AlertTriangle,
    CheckCircle2,
    TrendingUp,
    TrendingDown,
    Loader2,
} from "lucide-react";

const UNITS: readonly TimeUnit[] = [
    "second",
    "minute",
    "hour",
    "day",
    "week",
    "month",
];

const UNIT_LABELS: Record<TimeUnit, string> = {
    second: "Second",
    minute: "Minute",
    hour: "Hour",
    day: "Day",
    week: "Week",
    month: "Month",
};

function cycleUnit(current: TimeUnit, dir: number): TimeUnit {
    const idx = UNITS.indexOf(current);
    return UNITS[(idx + dir + UNITS.length) % UNITS.length];
}

interface ColorStop {
    pos: number;
    r: number;
    g: number;
    b: number;
}

function getValueColor(value: number): string {
    const stops: ColorStop[] = [
        { pos: 0, r: 59, g: 130, b: 246 },
        { pos: 30, r: 80, g: 160, b: 255 },
        { pos: 70, r: 255, g: 170, b: 50 },
        { pos: 100, r: 239, g: 68, b: 68 },
    ];
    let lower = stops[0];
    let upper = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
        if (value >= stops[i].pos && value <= stops[i + 1].pos) {
            lower = stops[i];
            upper = stops[i + 1];
            break;
        }
    }
    const t = (value - lower.pos) / (upper.pos - lower.pos);
    const r = Math.round(lower.r + (upper.r - lower.r) * t);
    const g = Math.round(lower.g + (upper.g - lower.g) * t);
    const b = Math.round(lower.b + (upper.b - lower.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
}

interface GradientStop {
    offset: string;
    color: string;
    opacity: number;
}

// Flat at low range so the line stays visible, then exponential pop above 70
const VALUE_GRADIENT_STOPS: GradientStop[] = [
    { offset: "0%", color: "rgb(59, 130, 246)", opacity: 0.15 },
    { offset: "30%", color: "rgb(80, 160, 255)", opacity: 0.15 },
    { offset: "70%", color: "rgb(255, 170, 50)", opacity: 0.3 },
    { offset: "100%", color: "rgb(239, 68, 68)", opacity: 1 },
];

function fmtTime(ts: number, unit: TimeUnit): string {
    const d = new Date(ts);
    switch (unit) {
        case "second":
            return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
        case "minute":
            return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
        case "hour":
            return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
        case "day":
        case "week":
        case "month":
            return d.toLocaleDateString("en", {
                month: "short",
                day: "numeric",
            });
    }
}

function fmtTooltipLabel(ts: number, unit: TimeUnit): string {
    const d = new Date(ts);
    const date = d.toLocaleDateString("en", { month: "short", day: "numeric" });

    switch (unit) {
        case "second":
        case "minute":
            return `${date} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
        case "hour":
            return `${date} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
        case "day":
        case "week":
        case "month":
            return date;
    }
}

interface MergedPoint {
    timestamp: number;
    [serverUuid: string]: number | null;
}

function mergeSeries(series: UsageSeries[]): MergedPoint[] {
    const timestamps = new Set<number>();
    series.forEach((s) => s.points.forEach((p) => timestamps.add(p.timestamp)));
    const sorted = [...timestamps].sort((a, b) => a - b);

    return sorted.map((ts) => {
        const point: MergedPoint = { timestamp: ts };
        series.forEach((s) => {
            const match = s.points.find((p) => p.timestamp === ts);
            point[s.server_uuid] = match?.value ?? null;
        });
        return point;
    });
}

function trimEdgeNulls(data: MergedPoint[]): MergedPoint[] {
    const serverKeys = Object.keys(data[0] ?? {}).filter(
        (k) => k !== "timestamp",
    );
    let start = 0;
    while (
        start < data.length &&
        serverKeys.every((k) => data[start][k] == null)
    ) {
        start++;
    }
    let end = data.length - 1;
    while (end > start && serverKeys.every((k) => data[end][k] == null)) {
        end--;
    }
    return start > 0 || end < data.length - 1
        ? data.slice(start, end + 1)
        : data;
}

interface UsageSectionProps {
    title: string;
    metric: MetricKey;
    icon: React.ReactNode;
    unit: TimeUnit;
    onUnitChange: (unit: TimeUnit) => void;
}

function UsageSection({
    title,
    metric,
    icon,
    unit,
    onUnitChange,
}: UsageSectionProps) {
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const [fullscreen, setFullscreen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipScrollRef = useRef(0);
    const savedScrollY = useRef(0);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            savedScrollY.current = window.scrollY;
            containerRef.current?.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }, []);

    useEffect(() => {
        const handler = () => {
            const isFs = !!document.fullscreenElement;
            setFullscreen(isFs);
            if (!isFs && savedScrollY.current > 0) {
                window.scrollTo(0, savedScrollY.current);
                savedScrollY.current = 0;
            }
        };
        document.addEventListener("fullscreenchange", handler);
        return () => document.removeEventListener("fullscreenchange", handler);
    }, []);

    const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
        useDashboardUsage(metric, unit);

    const flattenedData = useMemo(() => {
        if (!data?.pages?.length) return null;

        const latestPage = data.pages[0];
        const mergedSeriesMap = new Map<string, UsageSeries>();

        data.pages.forEach((page) => {
            page.series.forEach((serverSeries) => {
                const existing = mergedSeriesMap.get(serverSeries.server_uuid);
                if (existing) {
                    existing.points.push(...serverSeries.points);
                } else {
                    mergedSeriesMap.set(serverSeries.server_uuid, {
                        ...serverSeries,
                        points: [...serverSeries.points],
                    });
                }
            });
        });

        return {
            unit: latestPage.unit,
            metric: latestPage.metric,
            series: Array.from(mergedSeriesMap.values()),
            top: latestPage.top,
        };
    }, [data]);

    const mergedData = useMemo(() => {
        if (!flattenedData?.series) return [];
        return trimEdgeNulls(mergeSeries(flattenedData.series));
    }, [flattenedData?.series]);

    const xDomain = useMemo(() => {
        if (mergedData.length === 0) return undefined;
        const min = mergedData[0].timestamp;
        const max = mergedData[mergedData.length - 1].timestamp;
        if (min === max) {
            const pad = 60000;
            return [min - pad, max + pad];
        }
        return [min, max];
    }, [mergedData]);

    const nonNullCounts = useMemo(() => {
        const map = new Map<string, number>();
        if (!flattenedData?.series) return map;
        for (const s of flattenedData.series) {
            const count = s.points.filter((p) => p.value != null).length;
            map.set(s.server_uuid, count);
        }
        return map;
    }, [flattenedData?.series]);

    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const prevScrollWidth = useRef(0);
    const prevScrollLeft = useRef(0);
    const isAtRightEdge = useRef(true);
    const prevUnit = useRef(unit);
    const [containerWidth, setContainerWidth] = useState(0);

    const [yLabelPositions, setYLabelPositions] = useState<
        { value: number; top: number }[]
    >([]);
    const chartSvgRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const raf = requestAnimationFrame(() => {
            const el = chartSvgRef.current;
            if (!el) return;
            const lines = el.querySelectorAll(
                ".recharts-cartesian-grid-horizontal line",
            );
            if (lines.length > 0) {
                const yValues = Array.from(lines)
                    .map((l) => parseFloat(l.getAttribute("y1") ?? ""))
                    .sort((a, b) => a - b);
                const positions = yValues.map((y, i) => ({
                    value: [100, 75, 50, 25, 0][i],
                    top: y,
                }));
                setYLabelPositions(positions);
            }
        });
        return () => cancelAnimationFrame(raf);
    }, [mergedData.length, fullscreen]);

    const handleScroll: React.UIEventHandler<HTMLDivElement> = () => {
        if (!scrollContainerRef.current) return;

        const { scrollLeft, scrollWidth, clientWidth } =
            scrollContainerRef.current;
        prevScrollLeft.current = scrollLeft;
        isAtRightEdge.current = scrollLeft + clientWidth >= scrollWidth - 10;

        if (scrollLeft < 50 && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    };

    useEffect(() => {
        if (!scrollContainerRef.current) return;
        const el = scrollContainerRef.current;
        const { scrollWidth, clientWidth } = el;

        if (prevUnit.current !== unit) {
            prevScrollWidth.current = scrollWidth;
            prevScrollLeft.current = 0;
            prevUnit.current = unit;
            return;
        }

        if (scrollWidth > clientWidth) {
            if (
                prevScrollWidth.current > 0 &&
                scrollWidth > prevScrollWidth.current
            ) {
                if (prevScrollLeft.current < 50) {
                    const diff = scrollWidth - prevScrollWidth.current;
                    el.scrollLeft = prevScrollLeft.current + diff;
                } else if (isAtRightEdge.current) {
                    el.scrollLeft = scrollWidth - clientWidth;
                }
            } else {
                el.scrollLeft = scrollWidth - clientWidth;
            }
        }

        prevScrollWidth.current = scrollWidth;
    }, [mergedData.length, unit]);

    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerWidth(entry.contentRect.width);
            }
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    const chartWidth =
        mergedData.length === 0
            ? undefined
            : mergedData.length * 40;

    const handleWheel: React.WheelEventHandler<HTMLDivElement> = (e) => {
        if (e.shiftKey) {
            e.preventDefault();
            onUnitChange(cycleUnit(unit, e.deltaY > 0 ? 1 : -1));
        }
    };

    const toggleServer = useCallback((uuid: string) => {
        setSelectedServer((prev) => (prev === uuid ? null : uuid));
    }, []);

    const stats = useMemo(() => {
        if (!flattenedData?.top?.length) return null;
        const values = flattenedData.top.map((t) => t.value);
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        const min = Math.min(...values);
        const max = Math.max(...values);
        const healthy = values.filter((v) => v < 50).length;
        const warning = values.filter((v) => v >= 50 && v < 80).length;
        const critical = values.filter((v) => v >= 80).length;
        return {
            min,
            max,
            avg,
            healthy,
            warning,
            critical,
            total: values.length,
        } as const;
    }, [flattenedData?.top]);

    return (
        <div
            ref={containerRef}
            className={`rounded-xl border border-border/60 bg-card p-4 ${fullscreen ? "fixed inset-0 z-50 overflow-auto" : ""}`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {icon && (
                        <span className="text-muted-foreground">{icon}</span>
                    )}
                    <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                        {title}
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" type="button">
                                {UNIT_LABELS[unit]}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>
                                Time Unit
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                                {UNITS.map((u) => (
                                    <DropdownMenuItem
                                        key={u}
                                        onSelect={() =>
                                            onUnitChange(u as TimeUnit)
                                        }
                                    >
                                        {UNIT_LABELS[u]}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuGroup>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <button
                        onClick={toggleFullscreen}
                        className="p-1 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
                    >
                        {fullscreen ? (
                            <Minimize2 size={14} />
                        ) : (
                            <Maximize2 size={14} />
                        )}
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center h-52 animate-pulse text-sm text-muted-foreground">
                    Loading…
                </div>
            ) : !flattenedData?.series.length ? (
                <div className="flex items-center justify-center h-52 text-sm text-muted-foreground">
                    No data
                </div>
            ) : (
                <div
                    className={`flex ${fullscreen ? "flex-col" : "flex-row"} gap-4`}
                >
                    {fullscreen && stats && (
                        <div className="flex items-center gap-4 text-xs text-muted-foreground border border-border/60 rounded-lg px-4 py-2.5 shrink-0">
                            <span className="flex items-center gap-1.5">
                                <CheckCircle2
                                    size={14}
                                    className="text-emerald-400"
                                />
                                <span className="font-medium text-foreground">
                                    {stats.healthy}
                                </span>
                                <span>healthy (&lt;50)</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <AlertTriangle
                                    size={14}
                                    className="text-amber-400"
                                />
                                <span className="font-medium text-foreground">
                                    {stats.warning}
                                </span>
                                <span>warning (50–80)</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Activity size={14} className="text-red-400" />
                                <span className="font-medium text-foreground">
                                    {stats.critical}
                                </span>
                                <span>critical (&gt;80)</span>
                            </span>
                            <span className="w-px h-4 bg-border" />
                            <span className="flex items-center gap-1.5">
                                <TrendingDown size={14} />
                                <span className="font-medium text-foreground">
                                    {stats.min.toFixed(1)}%
                                </span>
                                <span>min</span>
                            </span>
                            <span className="flex items-center gap-1.5">
                                <TrendingUp size={14} />
                                <span className="font-medium text-foreground">
                                    {stats.max.toFixed(1)}%
                                </span>
                                <span>max</span>
                            </span>
                            <span className="w-px h-4 bg-border" />
                            <span className="flex items-center gap-1.5">
                                <Activity size={14} />
                                <span className="font-medium text-foreground">
                                    {stats.avg.toFixed(1)}%
                                </span>
                                <span>avg</span>
                            </span>
                        </div>
                    )}

                    <div
                        style={{
                            display: "flex",
                            flexDirection: "row",
                            flex: 1,
                            minWidth: 0,
                            minHeight: 0,
                        }}
                    >
                        <div
                            style={{
                                width: 32,
                                position: "relative",
                                fontSize: 10,
                                color: "var(--color-muted-foreground)",
                                textAlign: "right",
                            }}
                        >
                            {yLabelPositions.map(({ value, top }) => (
                                <div
                                    key={value}
                                    style={{
                                        position: "absolute",
                                        top,
                                        right: 2,
                                        transform: "translateY(-50%)",
                                        lineHeight: 1,
                                    }}
                                >
                                    {value}%
                                </div>
                            ))}
                        </div>
                        <div
                            className={
                                fullscreen
                                    ? "flex-1 overflow-x-auto"
                                    : "flex-1 overflow-x-auto"
                            }
                            ref={scrollContainerRef}
                            onScroll={handleScroll}
                            onWheel={handleWheel}
                            style={{ position: "relative" }}
                        >
                            {mergedData.length === 0 ? (
                                <div className="flex items-center justify-center h-full min-h-50 text-sm text-muted-foreground border border-dashed border-border/50 rounded-lg">
                                    No data for this time period
                                </div>
                            ) : (
                                <div
                                    ref={chartSvgRef}
                                    style={{
                                        width: chartWidth,
                                        height: fullscreen ? "100%" : undefined,
                                    }}
                                >
                                    <LineChart
                                        width={chartWidth}
                                        height={fullscreen ? 500 : 200}
                                        data={mergedData}
                                        syncId="usage"
                                        margin={{
                                            top: 0,
                                            right: 0,
                                            left: 0,
                                            bottom: 0,
                                        }}
                                    >
                                        <defs>
                                            <linearGradient
                                                id={`usageGradient-${metric}`}
                                                gradientUnits="userSpaceOnUse"
                                                x1="0"
                                                y1={fullscreen ? 500 : 200}
                                                x2="0"
                                                y2="0"
                                            >
                                                {VALUE_GRADIENT_STOPS.map(
                                                    (s) => (
                                                        <stop
                                                            key={s.offset}
                                                            offset={s.offset}
                                                            stopColor={s.color}
                                                            stopOpacity={
                                                                s.opacity
                                                            }
                                                        />
                                                    ),
                                                )}
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid
                                            stroke="var(--color-border)"
                                            strokeOpacity={0.5}
                                            vertical={false}
                                            horizontalValues={[
                                                0, 25, 50, 75, 100,
                                            ]}
                                        />
                                        <XAxis
                                            dataKey="timestamp"
                                            type="number"
                                            scale="time"
                                            domain={xDomain}
                                            minTickGap={40}
                                            tickLine={false}
                                            axisLine={false}
                                            tick={({
                                                x,
                                                y,
                                                payload,
                                                index,
                                                visibleTicksCount,
                                            }: XAxisTickContentProps) => {
                                                const anchor = "middle";
                                                const adjustedX =
                                                    index === 0
                                                        ? x + 5
                                                        : index === visibleTicksCount - 1
                                                          ? x - 5
                                                          : x;
                                                const d = new Date(
                                                    payload.value,
                                                );
                                                const time = fmtTime(
                                                    payload.value,
                                                    unit,
                                                );
                                                const isToday =
                                                    d.toDateString() ===
                                                    new Date().toDateString();
                                                const hideDate =
                                                    unit === "day" ||
                                                    unit === "week" ||
                                                    unit === "month";
                                                if (hideDate || isToday) {
                                                    return (
                                                        <text
                                                            x={adjustedX}
                                                            y={y}
                                                            dy={4}
                                                            textAnchor={anchor}
                                                            fontSize={10}
                                                            fill="var(--color-muted-foreground)"
                                                        >
                                                            {time}
                                                        </text>
                                                    );
                                                }
                                                const date =
                                                    d.toLocaleDateString("en", {
                                                        month: "short",
                                                        day: "numeric",
                                                    });
                                                return (
                                                    <text
                                                        x={adjustedX}
                                                        y={y}
                                                        dy={0}
                                                        textAnchor={anchor}
                                                        fontSize={10}
                                                        fill="var(--color-muted-foreground)"
                                                    >
                                                        <tspan x={adjustedX} dy="-4">
                                                            {date}
                                                        </tspan>
                                                        <tspan x={adjustedX} dy="12">
                                                            {time}
                                                        </tspan>
                                                    </text>
                                                );
                                            }}
                                        />
                                        <Tooltip
                                            isAnimationActive={false}
                                            cursor={{
                                                stroke: "rgba(255,255,255,0.15)",
                                                strokeWidth: 1,
                                            }}
                                            content={({
                                                active,
                                                payload,
                                                label,
                                            }: TooltipContentProps) => {
                                                if (!active || !payload?.length)
                                                    return null;
                                                return (
                                                    <div
                                                        style={{
                                                            backgroundColor:
                                                                "oklch(0.205 0 0)",
                                                            border: "1px solid rgba(255,255,255,0.1)",
                                                            borderRadius: "8px",
                                                            fontSize: "11px",
                                                            color: "rgba(255,255,255,0.85)",
                                                            maxHeight: 200,
                                                            overflowY: "auto",
                                                        }}
                                                        onWheel={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                        onScroll={(e) => {
                                                            tooltipScrollRef.current =
                                                                e.currentTarget.scrollTop;
                                                        }}
                                                        ref={(el) => {
                                                            if (el)
                                                                el.scrollTop =
                                                                    tooltipScrollRef.current;
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                padding:
                                                                    "6px 10px 2px",
                                                                fontWeight: 600,
                                                                borderBottom:
                                                                    "1px solid rgba(255,255,255,0.08)",
                                                            }}
                                                        >
                                                            {fmtTooltipLabel(
                                                                Number(label),
                                                                unit,
                                                            )}
                                                        </div>
                                                        {[...payload]
                                                            .filter(
                                                                (entry) =>
                                                                    entry.value !=
                                                                    null,
                                                            )
                                                            .sort(
                                                                (a, b) =>
                                                                    Number(
                                                                        b.value ??
                                                                            0,
                                                                    ) -
                                                                    Number(
                                                                        a.value ??
                                                                            0,
                                                                    ),
                                                            )
                                                            .map((entry) => {
                                                                const s =
                                                                    flattenedData?.series?.find(
                                                                        (s) =>
                                                                            s.server_uuid ===
                                                                            entry.name,
                                                                    );
                                                                return (
                                                                    <div
                                                                        key={
                                                                            entry.name
                                                                        }
                                                                        style={{
                                                                            display:
                                                                                "flex",
                                                                            alignItems:
                                                                                "center",
                                                                            justifyContent:
                                                                                "space-between",
                                                                            gap: 12,
                                                                            padding:
                                                                                "3px 10px",
                                                                            cursor: "default",
                                                                        }}
                                                                    >
                                                                        <span
                                                                            style={{
                                                                                display:
                                                                                    "flex",
                                                                                alignItems:
                                                                                    "center",
                                                                                gap: 6,
                                                                                minWidth: 0,
                                                                            }}
                                                                        >
                                                                            <span
                                                                                style={{
                                                                                    width: 8,
                                                                                    height: 8,
                                                                                    borderRadius:
                                                                                        "50%",
                                                                                    backgroundColor:
                                                                                        entry.color,
                                                                                    display:
                                                                                        "inline-block",
                                                                                    flexShrink: 0,
                                                                                }}
                                                                            />
                                                                            <span
                                                                                style={{
                                                                                    overflow:
                                                                                        "hidden",
                                                                                    textOverflow:
                                                                                        "ellipsis",
                                                                                    whiteSpace:
                                                                                        "nowrap",
                                                                                }}
                                                                            >
                                                                                {s?.server_name ??
                                                                                    entry.name}
                                                                            </span>
                                                                        </span>
                                                                        <span
                                                                            style={{
                                                                                fontFamily:
                                                                                    "monospace",
                                                                                flexShrink: 0,
                                                                            }}
                                                                        >
                                                                            {Number(
                                                                                entry.value,
                                                                            ).toFixed(
                                                                                1,
                                                                            )}
                                                                            %
                                                                        </span>
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                );
                                            }}
                                        />
                                        {flattenedData.series.map((s) => (
                                            <Line
                                                key={s.server_uuid}
                                                type="monotone"
                                                dataKey={s.server_uuid}
                                                stroke={`url(#usageGradient-${metric})`}
                                                dot={
                                                    (nonNullCounts.get(
                                                        s.server_uuid,
                                                    ) ?? 0) <= 1
                                                        ? {
                                                              r: 3,
                                                              fill: `url(#usageGradient-${metric})`,
                                                              strokeWidth: 0,
                                                          }
                                                        : false
                                                }
                                                strokeWidth={1.5}
                                                isAnimationActive={false}
                                                connectNulls
                                                strokeOpacity={
                                                    selectedServer
                                                        ? selectedServer ===
                                                          s.server_uuid
                                                            ? 1
                                                            : 0.12
                                                        : 1
                                                }
                                            />
                                        ))}
                                    </LineChart>
                                </div>
                            )}
                            {isFetchingNextPage && (
                                <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1.5 rounded-md bg-background/80 px-2 py-1 text-xs text-muted-foreground backdrop-blur-xs border border-border/50">
                                    <Loader2 className="size-3 animate-spin" />
                                    Loading older data...
                                </div>
                            )}
                        </div>
                    </div>
                    <div
                        className={`${fullscreen ? "w-full" : "w-56 shrink-0"} space-y-0.5 ${fullscreen ? "max-h-40" : "max-h-60"} overflow-y-auto`}
                    >
                        {fullscreen && (
                            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide px-2 py-1">
                                Server Ranking
                            </div>
                        )}
                        {flattenedData.top.map((item) => {
                            const color = getValueColor(item.value);
                            const isSelected =
                                selectedServer === item.server_uuid;
                            return (
                                <div
                                    key={item.server_uuid}
                                    onClick={() =>
                                        toggleServer(item.server_uuid)
                                    }
                                    className={`flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer ${
                                        isSelected
                                            ? "bg-accent text-accent-foreground"
                                            : "hover:bg-muted text-foreground"
                                    }`}
                                >
                                    <span className="flex items-center gap-2 min-w-0">
                                        <span
                                            className="w-2 h-2 rounded-full shrink-0"
                                            style={{
                                                backgroundColor: color,
                                            }}
                                        />
                                        <span className="truncate">
                                            {item.server_name}
                                        </span>
                                        <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                                            {item.client_name}
                                        </span>
                                    </span>
                                    <span
                                        className="font-mono text-xs font-medium tabular-nums ml-2 shrink-0"
                                        style={{ color }}
                                    >
                                        {item.value.toFixed(1)}%
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default UsageSection;
