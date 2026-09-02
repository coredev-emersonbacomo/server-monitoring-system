import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import jwtClient from "@/api/jwtClient";

// GET /settings returns Setting DB values as strings (+ agent_version).
export interface SystemSettings {
    secop_limit_per_client: string;
    heartbeat_interval: string;
    offline_threshold: string;
    port_ping_interval: string;
    agent_log_retention_days: string;
    agent_version: string;
}

// PUT /settings request body. Mirrors App\Data\UpdateSettingsData (Spatie Data)
// emitted by the OpenAPI spec: numeric settings are integers, agent_version is a
// string. Kept local rather than referencing schema.d.ts because the committed
// OpenAPI artifacts are stale and full regeneration currently drops the
// Paginator model used across the app (see TODO 08-hybrid-pagination).
export interface SettingsUpdatePayload {
    secop_limit_per_client?: number | null;
    heartbeat_interval?: number | null;
    offline_threshold?: number | null;
    port_ping_interval?: number | null;
    agent_log_retention_days?: number | null;
    agent_version?: string | null;
}

const normalizeSettings = (data: Partial<SystemSettings> | Record<string, unknown> | null | undefined): SystemSettings => ({
    secop_limit_per_client: String(data?.secop_limit_per_client ?? data?.["secop_limit_per_client"] ?? ""),
    heartbeat_interval: String(data?.heartbeat_interval ?? data?.["heartbeat_interval"] ?? ""),
    offline_threshold: String(data?.offline_threshold ?? data?.["offline_threshold"] ?? ""),
    port_ping_interval: String(data?.port_ping_interval ?? data?.["port_ping_interval"] ?? ""),
    agent_log_retention_days: String(data?.agent_log_retention_days ?? data?.["agent_log_retention_days"] ?? ""),
    agent_version: String(data?.agent_version ?? data?.["agent_version"] ?? ""),
});

export const useSettings = () =>
    useQuery<SystemSettings>({
        queryKey: ["settings"],
        queryFn: async () => {
            const { data } = await jwtClient.get<Partial<SystemSettings> | Record<string, unknown>>("/settings");
            return normalizeSettings(data);
        },
        staleTime: 60_000,
    });

export const useUpdateSettings = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: SettingsUpdatePayload) => {
            const { data } = await jwtClient.put<Partial<SystemSettings> | Record<string, unknown>>("/settings", payload);
            return normalizeSettings(data);
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["settings"], data);
            queryClient.invalidateQueries({ queryKey: ["settings"] });
        },
    });
};
