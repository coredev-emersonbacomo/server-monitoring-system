import { useQuery } from "@tanstack/react-query";
import api from "@/api/api";

export const useServer = (serverUuid: string) => {
    return useQuery({
        queryKey: ["server", serverUuid],
        queryFn: async () => {
            const { data, error } = await api.GET("/servers/{serverUuid}", {
                params: { path: { serverUuid: serverUuid } },
            });
            if (error) throw error;
            return data;
        },
        enabled: !!serverUuid,
    });
};
