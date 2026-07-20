import { useQuery, keepPreviousData } from "@tanstack/react-query";
import api from "@/api/api";

export const useServer = (
    serverUuid: string,
    options: {
        timeSubtract?: string;
        timeUnit?: number;
        fromTime?: string;
        toTime?: string;
    } = {}
) => {
    const { timeSubtract = '-2 hour', timeUnit = 1, fromTime, toTime } = options;
    return useQuery({
        queryKey: ["server", serverUuid, timeSubtract, timeUnit, fromTime, toTime],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/servers/{serverUuid}", {
                params: { 
                    path: { serverUuid },
                    query: { 
                        time_subtract: timeSubtract, 
                        time_unit: timeUnit,
                        from_time: fromTime,
                        to_time: toTime,
                    } as any,
                },
            });
            if (error) throw error;
            return data;
        },
        enabled: !!serverUuid,
        placeholderData: keepPreviousData,
    });
};
