import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import jwtClient from "@/api/jwtClient";

export interface SystemSettings {
    secop_limit_per_client: string;
}

export const useSettings = () =>
    useQuery<SystemSettings>({
        queryKey: ["settings"],
        queryFn: async () => {
            const { data } = await jwtClient.get<SystemSettings>("/settings");
            return data;
        },
        staleTime: 60_000,
    });

export const useUpdateSettings = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: Partial<SystemSettings>) => {
            const { data } = await jwtClient.put<SystemSettings>("/settings", payload);
            return data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["settings"], data);
        },
    });
};
