import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import jwtClient from "@/api/jwtClient";

export interface SystemSettings {
    secop_limit_per_client: string;
    heartbeat_interval: string;
    offline_threshold: string;
    port_ping_interval: string;
    agent_version: string;
}

const normalizeSettings = (data: Partial<SystemSettings> | Record<string, unknown> | null | undefined): SystemSettings => ({
    secop_limit_per_client: String(data?.secop_limit_per_client ?? data?.["secop_limit_per_client"] ?? ""),
    heartbeat_interval: String(data?.heartbeat_interval ?? data?.["heartbeat_interval"] ?? ""),
    offline_threshold: String(data?.offline_threshold ?? data?.["offline_threshold"] ?? ""),
    port_ping_interval: String(data?.port_ping_interval ?? data?.["port_ping_interval"] ?? ""),
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
        mutationFn: async (payload: Partial<SystemSettings>) => {
            const { data } = await jwtClient.put<Partial<SystemSettings> | Record<string, unknown>>("/settings", payload);
            return normalizeSettings(data);
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["settings"], data);
            queryClient.invalidateQueries({ queryKey: ["settings"] });
        },
    });
};
