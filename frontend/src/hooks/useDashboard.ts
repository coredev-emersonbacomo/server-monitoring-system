import { useQuery, useQueryClient } from "@tanstack/react-query";
import jwtClient from "@/api/jwtClient";
import type { DashboardStatsData as DashboardStats } from "@/types/models";

export const useDashboardStats = () => {
    const queryClient = useQueryClient();

    const query = useQuery<DashboardStats>({
        queryKey: ["dashboard", "stats"],
        queryFn: async () => {
            const { data } = await jwtClient.get<DashboardStats>("/dashboard/stats");
            return data;
        },
        staleTime: 30_000,
        refetchInterval: 60_000,
    });

    const retry = () =>
        queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });

    return { ...query, retry };
};
