import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import jwtClient from "@/api/jwtClient";

export interface GlobalAlert {
    metric: string;
    threshold: number;
    notification_channel: string;
}

export const useGlobalAlerts = () =>
    useQuery<GlobalAlert[]>({
        queryKey: ["global-alerts"],
        queryFn: async () => {
            const { data } = await jwtClient.get<GlobalAlert[]>("/global-alerts");
            return data;
        },
        staleTime: 60_000,
    });

export const useUpdateGlobalAlerts = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { alerts: GlobalAlert[] }) => {
            const { data } = await jwtClient.put<{ message: string }>("/global-alerts", payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["global-alerts"] });
        },
    });
};
