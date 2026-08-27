import { useQuery } from "@tanstack/react-query";
import api from "@/api/api";

export interface ActivityLogData {
    id: number;
    logable_type: string | null;
    logable_id: string | null;
    user_id: number | null;
    user_uuid?: string | null;
    user: string | null;
    action: string;
    details: unknown;
    created_at: string | null;
    updated_at: string | null;
}

export interface PaginatedLogResponse {
    data: ActivityLogData[];
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
}

export interface ActivityLogsParams {
    page?: number;
    per_page?: number;
    search?: string;
    action?: string;
    user?: string;
    start_date?: string;
    end_date?: string;
    sort_field?: string;
    sort_dir?: "asc" | "desc";
}

export const useActivityLogs = (params?: ActivityLogsParams) => {
    return useQuery<PaginatedLogResponse>({
        queryKey: ["activity-logs", params],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/activity-logs", {
                params: {
                    query: params as never,
                },
            });
            if (error) throw error;
            return (data as unknown as PaginatedLogResponse) ?? {
                data: [],
                current_page: 1,
                per_page: 15,
                total: 0,
                last_page: 1,
            };
        },
    });
};

export const useServerHealthLogs = (params?: ActivityLogsParams) => {
    return useQuery<PaginatedLogResponse>({
        queryKey: ["server-health-logs", params],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/server-health-logs", {
                params: {
                    query: params as never,
                },
            });
            if (error) throw error;
            return (data as unknown as PaginatedLogResponse) ?? {
                data: [],
                current_page: 1,
                per_page: 15,
                total: 0,
                last_page: 1,
            };
        },
    });
};

export const useAgentLogs = (params?: ActivityLogsParams) => {
    return useQuery<PaginatedLogResponse>({
        queryKey: ["agent-logs", params],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/agent-logs", {
                params: {
                    query: params as never,
                },
            });
            if (error) throw error;
            return (data as unknown as PaginatedLogResponse) ?? {
                data: [],
                current_page: 1,
                per_page: 15,
                total: 0,
                last_page: 1,
            };
        },
    });
};

export const useBillingLogs = (params?: ActivityLogsParams) => {
    return useQuery<PaginatedLogResponse>({
        queryKey: ["billing-logs", params],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/billing-logs", {
                params: {
                    query: params as never,
                },
            });
            if (error) throw error;
            return (data as unknown as PaginatedLogResponse) ?? {
                data: [],
                current_page: 1,
                per_page: 15,
                total: 0,
                last_page: 1,
            };
        },
    });
};
