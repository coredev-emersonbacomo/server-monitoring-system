import { useQuery } from "@tanstack/react-query";
import api from "@/api/api";
import type { TimeUnit } from "@/types/dashboard";

export function useServerStats(serverUuid: string, unit: TimeUnit) {
    return useQuery({
        queryKey: ["server-stats", serverUuid, unit],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/servers/{serverUuid}/stats", {
                params: { path: { serverUuid }, query: { unit } },
            });
            if (error) throw error;
            return data; // StatPoint[]
        },
        enabled: !!serverUuid,
        staleTime: 60_000, // don't refetch on every focus
    });
}
