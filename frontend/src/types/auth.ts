export interface JwtAuthLoginPayload {
    email: string;
    password: string;
    remember?: boolean | null;
}

export interface SessionResource {
    session_uuid: string;
    current_session: boolean;
    compromised: boolean;
    status: string;
    device_type: string;
    host_name: string | null;
    compromise_reason: string | null;
    compromised_at: string | null;
    remember_me: boolean;
    browser?: string;
    operating_system: string | null;
    ip_address?: string | null;
    created_at?: string | null;
    last_activity_at?: string | null;
    last_activity_at_timestamp?: string | null;
    revoked_at?: string | null;
}
