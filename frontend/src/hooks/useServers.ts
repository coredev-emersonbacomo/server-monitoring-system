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

            return () => {
                channel.stopListening(".ServerStatusUpdated", handler);
            };
        } catch {
            // Echo not available yet
        }
    }, [queryClient]);

    return useQuery({
        queryKey: ["servers", clientUuid],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/servers", {
                params: { query: { client_uuid: clientUuid } },
            });
            if (error) throw error;
            return data;
        },
    });
};
