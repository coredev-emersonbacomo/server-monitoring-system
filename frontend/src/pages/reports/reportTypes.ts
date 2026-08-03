export interface ClientServerSummary {
    uuid: string;
    name: string;
    status: string;
    cpu_usage: number | null;
    memory_usage: number | null;
    disk_usage: number | null;
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
    avg_cpu_usage: number | null;
    avg_memory_usage: number | null;
    total_alerts: number;
    servers: ClientServerSummary[];
}

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
    uptime_seconds: number;
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
    servers_per_client: { client_name: string; server_count: number; active_alerts: number }[];
    recent_clients: { name: string; email: string; phone: string; created_at: string }[];
    recent_servers: { name: string; assigned_client: string; hostname: string; created_at: string }[];
    critical_alerts: number;
    warning_alerts: number;
    unassigned_servers: number;
    need_attention_servers: GeneralServerSummary[];
    sla_servers: GeneralServerSummary[];
}

export interface GeneralServerSummary {
    uuid: string;
    name: string;
    client_name: string;
    status: string;
    cpu_usage: number;
    memory_usage: number;
    uptime_percentage: number;
}
