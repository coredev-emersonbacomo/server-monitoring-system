import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";
import { getEchoInstance } from "@/hooks/useServerSocket";
import type { DashboardStatsData as DashboardStats } from "@/types/models";

export const useDashboardStats = () => {
    const queryClient = useQueryClient();

    useEffect(() => {
        try {
            const echo = getEchoInstance();
            const channel = echo.private("dashboard");

            const handleUpdate = () => {
                queryClient.invalidateQueries({
                    queryKey: ["dashboard", "stats"],
                });
            };

            channel.listen(".ServerStatusUpdated", handleUpdate);
            channel.listen(".RegistrationCompleted", handleUpdate);
            channel.listen(".AgentUninstalled", handleUpdate);

            return () => {
                channel.stopListening(".ServerStatusUpdated", handleUpdate);
                channel.stopListening(".RegistrationCompleted", handleUpdate);
                channel.stopListening(".AgentUninstalled", handleUpdate);
            };
        } catch {
            // Echo not available yet
        }
    }, [queryClient]);

    const query = useQuery<DashboardStats>({
        queryKey: ["dashboard", "stats"],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/dashboard/stats");
            if (error) throw error;
            return data as DashboardStats;
        },
        staleTime: 30_000,
        refetchInterval: 60_000,
    });

    const retry = () =>
        queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });

    return { ...query, retry };
};

