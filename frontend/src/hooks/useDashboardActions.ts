import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

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

const API_BASE = "/api";

export const useDashboardActions = () => {
    return useQuery<ActionItem[]>({
        queryKey: ["dashboard", "actions"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/dashboard/actions`, {
                headers: { Accept: "application/json" },
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to load dashboard actions");
            const json = await res.json();
            return json.data ?? json;
        },
        staleTime: 30_000,
        refetchInterval: 60_000,
    });
};

export const useCompletedActions = () => {
    return useQuery<ActionItem[]>({
        queryKey: ["dashboard", "actions", "completed"],
        queryFn: async () => {
            const res = await fetch(`${API_BASE}/dashboard/actions/completed`, {
                headers: { Accept: "application/json" },
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to load completed actions");
            const json = await res.json();
            return json.data ?? json;
        },
        staleTime: 30_000,
    });
};

export const useClaimAction = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (actionId: number) => {
            const res = await fetch(`${API_BASE}/dashboard/actions/${actionId}/claim`, {
                method: "POST",
                headers: { Accept: "application/json" },
                credentials: "include",
            });
            if (!res.ok) throw new Error("Failed to claim action");
            return res.json();
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
            const res = await fetch(`${API_BASE}/dashboard/actions/${actionId}/status`, {
                method: "POST",
                headers: {
                    Accept: "application/json",
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ status }),
            });
            if (!res.ok) throw new Error("Failed to update action status");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["dashboard", "actions"] });
            queryClient.invalidateQueries({ queryKey: ["dashboard", "actions", "completed"] });
        },
    });
};
