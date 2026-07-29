// File path: frontend/src/pages/reports/server-report/mockServerReport.ts
export interface ServerMetricPoint {
    timestamp: string;
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    network_rbytes: number;
    network_tbytes: number;
}

export interface ServerUptime {
    uptime_percentage: number;
    outage_count: number;
    last_downtime: string | null;
    current_uptime_seconds: number;
}

export interface ServerReport {
    uuid: string;
    name: string;
    description: string | null;
    client_name: string | null;
    host_name: string | null;
    cpu_model: string | null;
    cpu_cores: number | null;
    ram: string | null;
    disk: string | null;
    operating_system: string | null;
    environment: string | null;
    architecture: string | null;
    status: string;
    last_seen: string | null;
    metrics: ServerMetricPoint[];
    uptime: ServerUptime;
}

function generateMetrics(hours = 24, intervalMinutes = 5): ServerMetricPoint[] {
    const points: ServerMetricPoint[] = [];
    const now = Date.now();
    const count = Math.floor((hours * 60) / intervalMinutes);

    let cumulativeIn = 500_000_000;
    let cumulativeOut = 300_000_000;

    for (let i = count; i >= 0; i--) {
        const timestamp = new Date(
            now - i * intervalMinutes * 60_000,
        ).toISOString();

        // wavy-ish CPU with some spikes
        const cpuBase = 25 + Math.sin(i / 8) * 15;
        const cpuSpike = Math.random() > 0.92 ? Math.random() * 40 : 0;
        const cpu_usage = Math.min(
            98,
            Math.max(2, cpuBase + cpuSpike + (Math.random() * 6 - 3)),
        );

        const memory_usage = Math.min(
            95,
            Math.max(20, 55 + Math.sin(i / 15) * 10 + (Math.random() * 4 - 2)),
        );
        const disk_usage = Math.min(90, 62 + (count - i) * 0.005); // slowly climbing

        cumulativeIn += Math.floor(Math.random() * 5_000_000);
        cumulativeOut += Math.floor(Math.random() * 2_000_000);

        points.push({
            timestamp,
            cpu_usage: Math.round(cpu_usage * 10) / 10,
            memory_usage: Math.round(memory_usage * 10) / 10,
            disk_usage: Math.round(disk_usage * 10) / 10,
            network_rbytes: cumulativeIn,
            network_tbytes: cumulativeOut,
        });
    }

    return points;
}

export const mockServerReport: ServerReport = {
    uuid: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    name: "web-prod-01",
    description: "Primary production web server",
    client_name: "Acme Logistics",
    host_name: "web-prod-01.internal",
    cpu_model: "AMD EPYC 7402P",
    cpu_cores: 24,
    ram: "64GB",
    disk: "1TB NVMe",
    operating_system: "Ubuntu 22.04 LTS",
    environment: "production",
    architecture: "x86_64",
    status: "online",
    last_seen: new Date().toISOString(),
    metrics: generateMetrics(24, 5),
    uptime: {
        uptime_percentage: 99.42,
        outage_count: 1,
        last_downtime: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        current_uptime_seconds: 1_209_600, // 14 days
    },
};

// A handful of extra variants, useful for testing edge cases in the UI
export const mockServerReportOffline: ServerReport = {
    ...mockServerReport,
    uuid: "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    name: "db-backup-02",
    status: "offline",
    last_seen: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    uptime: {
        uptime_percentage: 87.1,
        outage_count: 4,
        last_downtime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        current_uptime_seconds: 0,
    },
};

export const mockServerReportNoData: ServerReport = {
    ...mockServerReport,
    uuid: "c3d4e5f6-a7b8-9012-cdef-123456789012",
    name: "new-server-pending",
    metrics: [],
    uptime: {
        uptime_percentage: 0,
        outage_count: 0,
        last_downtime: null,
        current_uptime_seconds: 0,
    },
};
const MOCK_SERVER_REPORTS: Record<string, ServerReport> = {
    [mockServerReport.uuid]: mockServerReport,
    [mockServerReportOffline.uuid]: mockServerReportOffline,
    [mockServerReportNoData.uuid]: mockServerReportNoData,
};

// Simulates an async API call, so the queryFn signature matches the real one
export async function mockGetServerReport(uuid: string): Promise<ServerReport> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return MOCK_SERVER_REPORTS[uuid] ?? mockServerReport;
}