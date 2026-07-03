import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import jwtClient from "@/api/jwtClient";
import type { NotificationLevel } from "@/components/thresholds/types";

export type NotificationSeverity =
    | "light"
    | "warning"
    | "critical";

export type NotificationChannel =
    | "email"
    | "sms";

export interface GlobalAlert {
    id: number;

    metric: string;

    name: string;

    threshold: number;

    severity: NotificationSeverity;

    channels: NotificationChannel[];

    enabled: boolean;

    created_at: string;

    updated_at: string;
}

export interface UpdateGlobalAlertsPayload {
    metrics: Record<string, NotificationLevel[]>;
}

export const useGlobalAlerts = () =>
    useQuery<GlobalAlert[]>({
        queryKey: ["global-alerts"],
        queryFn: async () => {
            const { data } =
                await jwtClient.get<GlobalAlert[]>("/global-alerts");

            return data;
        },
        staleTime: 60_000,
    });

export const useUpdateGlobalAlerts = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (
            payload: UpdateGlobalAlertsPayload
        ) => {
            const { data } =
                await jwtClient.put<{ message: string }>(
                    "/global-alerts",
                    payload
                );

            return data;
        },

        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["global-alerts"],
            });
        },
    });
};