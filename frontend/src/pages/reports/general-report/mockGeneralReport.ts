export interface GeneralReport {
    total_servers: number;
    total_clients: number;
    total_users: number;
    online_servers: number;
    offline_servers: number;
    total_alerts: number;
    avg_uptime_percentage: number;
    avg_cpu_usage: number;
    avg_memory_usage: number;
    avg_disk_usage: number;
    servers_per_client: { client_name: string; server_count: number }[];
    recent_clients: { name: string; created_at: string }[];
    recent_servers: { name: string; created_at: string }[];
    critical_alerts: number;
    warning_alerts: number;
    unassigned_servers: number;
}

export const mockGeneralReport: GeneralReport = {
    total_servers: 24,
    total_clients: 6,
    total_users: 11,
    online_servers: 20,
    offline_servers: 4,
    total_alerts: 9,
    avg_uptime_percentage: 97.8,
    avg_cpu_usage: 41.2,
    avg_memory_usage: 58.6,
    avg_disk_usage: 63.4,
    servers_per_client: [
        { client_name: "Acme Logistics", server_count: 5 },
        { client_name: "Globex Corp", server_count: 3 },
        { client_name: "Initech", server_count: 8 },
        { client_name: "Umbrella Inc", server_count: 4 },
        { client_name: "Stark Industries", server_count: 4 },
    ],
    recent_clients: [
        {
            name: "Stark Industries",
            created_at: new Date(Date.now() - 2 * 86_400_000).toISOString(),
        },
        {
            name: "Umbrella Inc",
            created_at: new Date(Date.now() - 5 * 86_400_000).toISOString(),
        },
    ],
    recent_servers: [
        {
            name: "web-prod-03",
            created_at: new Date(Date.now() - 1 * 86_400_000).toISOString(),
        },
        {
            name: "db-replica-01",
            created_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
        },
    ],
    critical_alerts: 2,
    warning_alerts: 7,
    unassigned_servers: 5,
};

export async function mockGetGeneralReport(): Promise<GeneralReport> {
    await new Promise((r) => setTimeout(r, 250));
    return mockGeneralReport;
}
