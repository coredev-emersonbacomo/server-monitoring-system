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
            const { data, error } = await api.GET("/activity-logs" as any, { params: {} });
            if (error) throw error;
            return data ?? [];
        },
    });
};
