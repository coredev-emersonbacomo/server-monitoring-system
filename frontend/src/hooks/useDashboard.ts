import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { DashboardStatsData as DashboardStats } from "@/types/models";

const API_BASE = "/api";

export const useDashboardStats = () => {
    const queryClient = useQueryClient();

    const query = useQuery<DashboardStats>({
        queryKey: ["dashboard", "stats"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/dashboard/stats`, {
                headers: { Accept: "application/json" },
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to load dashboard stats");
            return res.json();
        },
        staleTime: 30_000, // 30 seconds
        refetchInterval: 60_000, // refresh every minute
    });

    const retry = () =>
        queryClient.invalidateQueries({ queryKey: ["dashboard", "stats"] });

    return { ...query, retry };
};
