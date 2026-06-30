import { useQuery } from "@tanstack/react-query";
import api from "@/api/api";

export const useServers = (clientId?: number) => {
    return useQuery({
        queryKey: ["servers", clientId],
        queryFn: async () => {
            const params = clientId ? { client_id: clientId } : undefined;
            const { data, error } = await api.GET("/servers", {
                params: { query: { client_id: clientId } },
            });
            if (error) throw error;
            return data;
        },
    });
};
