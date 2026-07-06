export type NotificationChannel = "email" | "sms";

export type NotificationSeverity =
    | "light"
    | "warning"
    | "critical";

export interface NotificationLevel {
    id: string;

    // Light, Warning, Critical
    name: string;

    // 0-100
    threshold: number;

    // badge color
    severity: NotificationSeverity;

    // email, sms
    channels: NotificationChannel[];
}

export interface MetricCardData {
    metricId: string;
    title: string;
    description: string;
    icon: React.ReactNode;

    levels: NotificationLevel[];
}