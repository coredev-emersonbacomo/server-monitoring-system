export interface ClientServerSummary {
    uuid: string;
    name: string;
    status: string;
    cpu_usage: number;
    memory_usage: number;
    disk_usage: number;
    last_seen: string | null;
    uptime_percentage: number;
}

export interface ClientReport {
    uuid: string;
    name: string;
    email: string;
    location: string;
    contact: string;
    total_servers: number;
    online_servers: number;
    offline_servers: number;
    avg_cpu_usage: number;
    avg_memory_usage: number;
    total_alerts: number;
    servers: ClientServerSummary[];
}

function server(
    name: string,
    status: "online" | "offline",
    cpu: number,
    mem: number,
    disk: number,
): ClientServerSummary {
    return {
        uuid: crypto.randomUUID(),
        name,
        status,
        cpu_usage: cpu,
        memory_usage: mem,
        disk_usage: disk,
        last_seen:
            status === "online"
                ? new Date().toISOString()
                : new Date(Date.now() - 5 * 3_600_000).toISOString(),
        uptime_percentage:
            status === "online"
                ? 99.1 + Math.random()
                : 80 + Math.random() * 10,
    };
}

const MOCK_CLIENT_REPORTS: Record<string, ClientReport> = {
    "c-acme-logistics": {
        uuid: "c-acme-logistics",
        name: "Acme Logistics",
        email: "contact@acmelogistics.com",
        location: "Manila, Philippines",
        contact: "+63-2-555-0101",
        total_servers: 5,
        online_servers: 4,
        offline_servers: 1,
        avg_cpu_usage: 42.3,
        avg_memory_usage: 61.8,
        total_alerts: 3,
        servers: [
            server("web-prod-01", "online", 38, 55, 62),
            server("web-prod-02", "online", 45, 60, 58),
            server("db-primary", "online", 52, 74, 71),
            server("cache-01", "online", 22, 40, 30),
            server("db-backup-02", "offline", 0, 0, 0),
        ],
    },
    "c-globex": {
        uuid: "c-globex",
        name: "Globex Corp",
        email: "info@globexcorp.com",
        location: "New York, USA",
        contact: "+1-555-0200",
        total_servers: 3,
        online_servers: 3,
        offline_servers: 0,
        avg_cpu_usage: 31.5,
        avg_memory_usage: 48.2,
        total_alerts: 0,
        servers: [
            server("globex-web-01", "online", 25, 44, 40),
            server("globex-api-01", "online", 33, 50, 55),
            server("globex-db-01", "online", 36, 51, 47),
        ],
    },
    "c-initech": {
        uuid: "c-initech",
        name: "Initech",
        email: "support@initech.com",
        location: "Austin, USA",
        contact: "+1-555-0300",
        total_servers: 8,
        online_servers: 6,
        offline_servers: 2,
        avg_cpu_usage: 58.7,
        avg_memory_usage: 70.4,
        total_alerts: 7,
        servers: [
            server("initech-web-01", "online", 60, 72, 65),
            server("initech-web-02", "online", 55, 68, 60),
            server("initech-api-01", "online", 62, 75, 70),
            server("initech-db-primary", "online", 70, 80, 85),
            server("initech-cache-01", "online", 40, 55, 30),
            server("initech-queue-01", "online", 48, 60, 42),
            server("initech-backup-01", "offline", 0, 0, 0),
            server("initech-legacy-01", "offline", 0, 0, 0),
        ],
    },
};

export const mockClientReport = MOCK_CLIENT_REPORTS["c-acme-logistics"];

export async function mockGetClientReport(uuid: string): Promise<ClientReport> {
    await new Promise((r) => setTimeout(r, 300));
    return MOCK_CLIENT_REPORTS[uuid] ?? MOCK_CLIENT_REPORTS["c-acme-logistics"];
}
