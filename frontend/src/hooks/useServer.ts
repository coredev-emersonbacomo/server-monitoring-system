import { useQuery } from "@tanstack/react-query";
import api from "@/api/api";
import type { components } from "@/api/schema.d";

export const useServer = (serverUuid: string) => {
    return useQuery({
        queryKey: ["server", serverUuid],
        queryFn: async (): Promise<components["schemas"]["ServerData"]> => {
            const { data, error } = await api.GET("/servers/{uuid}", {
                params: { path: { uuid: serverUuid } },
            });
            if (error) throw error;
            return data as components["schemas"]["ServerData"];
        },
        enabled: !!serverUuid,
    });
};
