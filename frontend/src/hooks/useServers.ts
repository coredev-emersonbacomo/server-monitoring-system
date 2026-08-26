import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";
import { getEchoInstance } from "@/hooks/useServerSocket";

export const useServers = (clientUuid?: string) => {
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

    return useQuery({
        queryKey: ["servers", clientUuid],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/servers", {
                params: { query: { client_uuid: clientUuid } as never },
            });
            if (error) throw error;
            return data;
        },
        refetchInterval: 5000,
    });
};
