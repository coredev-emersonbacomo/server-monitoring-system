const YEARLY_SPANS = new Set(["1Y", "3Y", "6Y", "9Y", "12Y"]);
const MONTHLY_SPANS = new Set(["3M", "6M"]);
const WEEKLY_SPANS = new Set(["1W", "1M"]);

// Chart axis/tooltip time labels. Split from ServerStatChart so the component
// file only exports components (react-refresh).
export function fmtTime(ts: number, timeSpan: string = "1H") {
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

export function fmtDatetime(ts: number, timeSpan: string = "1H") {
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
