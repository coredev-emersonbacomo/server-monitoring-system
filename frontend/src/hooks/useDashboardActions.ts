import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";

export interface ActionItem {
    id: number;
    action_type: "no_secops" | "server_offline";
    message: string;
    severity: "critical" | "warning" | "info";
    server_uuid: string | null;
    client_uuid: string | null;
    client_name: string | null;
    server_name: string | null;
    assigned_to_uuid: string | null;
    assigned_to_name: string | null;
    status: "open" | "in_progress" | "completed";
    created_at: string | null;
}

export const useDashboardActions = () => {
    return useQuery<ActionItem[]>({
        queryKey: ["dashboard", "actions"],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/dashboard/actions");
            if (error) throw error;
            return data as ActionItem[];
        },
        staleTime: 30_000,
        refetchInterval: 60_000,
    });
};

export const useCompletedActions = () => {
    return useQuery<ActionItem[]>({
        queryKey: ["dashboard", "actions", "completed"],
        queryFn: async () => {
            const { data, error } = await api.GET(
                "/v1/dashboard/actions/completed",
            );
            if (error) throw error;
            return data as ActionItem[];
        },
        staleTime: 30_000,
    });
};

export const useClaimAction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (actionId: number) => {
            const { data, error } = await api.POST(
                "/v1/dashboard/actions/{actionId}/claim",
                {
                    params: { path: { actionId } },
                },
            );
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["dashboard", "actions"],
            });
        },
    });
};

export const useUpdateActionStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({
            actionId,
            status,
        }: {
            actionId: number;
            status: string;
        }) => {
            const { data, error } = await api.POST(
                "/v1/dashboard/actions/{actionId}/status",
                {
                    params: { path: { actionId } },
                    body: { status } as never,
                },
            );
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["dashboard", "actions"],
            });
            queryClient.invalidateQueries({
                queryKey: ["dashboard", "actions", "completed"],
            });
        },
    });
};
