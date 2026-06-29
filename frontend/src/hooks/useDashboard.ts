import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";
import type { DashboardStatsData as DashboardStats } from "@/types/models";

export const useDashboardStats = () => {
    const queryClient = useQueryClient();

    const query = useQuery<DashboardStats>({
        queryKey: ["dashboard", "stats"],
        queryFn: async () => {
            const { data, error } = await api.GET("/dashboard/stats");
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
