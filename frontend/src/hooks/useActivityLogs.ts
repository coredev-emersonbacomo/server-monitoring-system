import { useQuery } from "@tanstack/react-query";
import api from "@/api/api";

export interface ActivityLogData {
    id: number;
    logable_type: string;
    logable_id: string;
    user_id: number | null;
    user: string | null;
    action: string;
    details: string;
    created_at: string | null;
    updated_at: string | null;
}

export const useActivityLogs = () => {
    return useQuery<ActivityLogData[]>({
        queryKey: ["activity-logs"],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/activity-logs" as any, {
                params: {},
            });
            if (error) throw error;
            return (data as ActivityLogData[]) ?? [];
        },
    });
};

export const useServerHealthLogs = () => {
    return useQuery<ActivityLogData[]>({
        queryKey: ["server-health-logs"],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/server-health-logs" as any, {
                params: {},
            });
            if (error) throw error;
            return (data as ActivityLogData[]) ?? [];
        },
    });
};

export const useAgentLogs = () => {
    return useQuery<ActivityLogData[]>({
        queryKey: ["agent-logs"],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/agent-logs" as any, {
                params: {},
            });
            if (error) throw error;
            return (data as ActivityLogData[]) ?? [];
        },
    });
};

export const useBillingLogs = () => {
    return useQuery<ActivityLogData[]>({
        queryKey: ["billing-logs"],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/billing-logs" as any, {
                params: {},
            });
            if (error) throw error;
            return (data as ActivityLogData[]) ?? [];
        },
    });
};
