import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";
import { getEchoInstance } from "@/hooks/useServerSocket";
import type { Paginator, ServerData } from "@/types/models";

export const useServers = (params?: {
    client_uuid?: string;
    q?: string;
    status?: string;
    sort?: string;
    dir?: "asc" | "desc";
    page?: number;
    per_page?: number;
}) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        try {
            const echo = getEchoInstance();
            const channel = echo.private("dashboard");

            const handler = () => {
                queryClient.invalidateQueries({ queryKey: ["servers"] });
            };

            channel.listen(".ServerStatusUpdated", handler);
            channel.listen(".RegistrationCompleted", handler);
            channel.listen(".AgentUninstalled", handler);

            return () => {
                channel.stopListening(".ServerStatusUpdated", handler);
                channel.stopListening(".RegistrationCompleted", handler);
                channel.stopListening(".AgentUninstalled", handler);
            };
        } catch {
            // Echo not available yet
        }
    }, [queryClient]);

    return useQuery<Paginator<ServerData>>({
        queryKey: ["servers", params],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/servers", {
                params: { query: (params ?? undefined) as never },
            });
            if (error) throw error;
            return data as Paginator<ServerData>;
        },
        refetchInterval: 5000,
    });
};
