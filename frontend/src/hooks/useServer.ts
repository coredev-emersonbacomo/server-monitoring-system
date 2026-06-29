import { useQuery } from "@tanstack/react-query";
import api from "@/api/api";

export const useServer = (id: number) => {
    return useQuery({
        queryKey: ["server", id],
        queryFn: async () => {
            const { data, error } = await api.GET("/servers/{id}", {
                params: { path: { id } },
            });
            if (error) throw error;
            return data;
        },
        enabled: !!id,
    });
};
