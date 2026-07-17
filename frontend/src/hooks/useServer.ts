import { useQuery } from "@tanstack/react-query";
import api from "@/api/api";

export const useServer = (serverUuid: string, timeSubtract: string = '-2 hour', timeUnit: number = 1) => {
    return useQuery({
        queryKey: ["server", serverUuid, timeSubtract, timeUnit],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/servers/{serverUuid}", {
                params: { 
                    path: { serverUuid },
                    query: { time_subtract: timeSubtract, time_unit: timeUnit } as any,
                },
            });
            if (error) throw error;
            return data;
        },
        enabled: !!serverUuid,
    });
};
