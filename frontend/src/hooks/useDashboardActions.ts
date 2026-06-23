import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import jwtClient from "@/api/jwtClient";

export interface ActionItem {
    id: number;
    action_type: "no_secops" | "server_offline" | "server_warning";
    message: string;
    severity: "critical" | "warning" | "info";
    server_id: number | null;
    client_id: number | null;
    client_name: string | null;
    server_name: string | null;
    assigned_to: number | null;
    assigned_to_name: string | null;
    status: "open" | "in_progress" | "completed";
}

export const useDashboardActions = () => {
    return useQuery<ActionItem[]>({
        queryKey: ["dashboard", "actions"],
        queryFn: async () => {
            const { data } = await jwtClient.get<ActionItem[]>("/dashboard/actions");
            return data;
        },
        staleTime: 30_000,
        refetchInterval: 60_000,
    });
};

export const useCompletedActions = () => {
    return useQuery<ActionItem[]>({
        queryKey: ["dashboard", "actions", "completed"],
        queryFn: async () => {
            const { data } = await jwtClient.get<ActionItem[]>("/dashboard/actions/completed");
            return data;
        },
        staleTime: 30_000,
    });
};

export const useClaimAction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (actionId: number) => {
            const { data } = await jwtClient.post(`/dashboard/actions/${actionId}/claim`);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["dashboard", "actions"] });
        },
    });
};

export const useUpdateActionStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ actionId, status }: { actionId: number; status: string }) => {
            const { data } = await jwtClient.post(`/dashboard/actions/${actionId}/status`, { status });
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["dashboard", "actions"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard", "actions", "completed"] });
        },
    });
};
