export interface TelemetryTask {
    task_id: string;
    config_id: number;
    node_id: string;
    server_id: number | null;
    fire_at: number; // microtime float
    delay_ms: number;
    created_at: number;
    context: Record<string, unknown>;
    live_stats?: {
        avg_value: number;
        total_samples: number;
        violating_samples: number;
        sustain_percent: number;
        threshold: number;
        operator: string;
    };
}

export interface TelemetryEvent {
    id: string;
    type: string;
    timestamp: number;
    payload: Record<string, unknown>;
}

export interface Particle {
    id: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    progress: number; // 0 to 1
    color: string;
    speed: number;
}

export interface OfflineServer {
    uuid: string;
    name: string;
    client_name: string;
    went_offline_at: string | null;
}
