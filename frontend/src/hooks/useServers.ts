import { useQuery } from "@tanstack/react-query";
import api from "@/api/api";

export const useServers = (clientUuid?: string) => {
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
