export interface UsagePoint {
    timestamp: number;
    value: number | null;
}

export interface UsageSeries {
    server_uuid: string;
    server_name: string;
    client_name: string;
    points: UsagePoint[];
}

export interface UsageTopItem {
    server_uuid: string;
    server_name: string;
    client_name: string;
    value: number;
}

export type UsageScope = "all" | "avg" | "server";

export interface UsageData {
    unit: TimeUnit;
    metric: MetricKey;
    scope: UsageScope;
    series: UsageSeries[];
    top: UsageTopItem[];
    nextCursor: number | null;
}

export type TimeUnit = "second" | "minute" | "hour" | "day" | "week" | "month";
export type MetricKey = "cpu" | "memory" | "disk";
