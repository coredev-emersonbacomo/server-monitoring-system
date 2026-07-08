import { useQuery } from "@tanstack/react-query";
import api from "@/api/api";

export interface SystemLogData {
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

export const useSystemLogs = () => {
    return useQuery<SystemLogData[]>({
        queryKey: ["system-logs"],
        queryFn: async () => {
            const { data, error } = await api.GET("/system-logs", { params: {} });
            if (error) throw error;
            return data ?? [];
        },
    });
};