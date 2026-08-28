import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";

export interface AgentServerRef {
    uuid: string;
    name: string | null;
}

export interface FileActivityLogData {
    uuid: string;
    server_id: string;
    server_uuid: string | null;
    server_name: string | null;
    agent_servers: AgentServerRef[] | null;
    agent_id: string;
    action: string;
    file_name: string;
    source_path: string;
    destination_path: string;
    is_directory: string;
    username: string | null;
    process_name: string | null;
    process_id: string | null;
    occurred_at: string;
    created_at: string;
}

export interface AgentLifecycleLogData {
    uuid: string;
    server_id: string;
    server_uuid: string | null;
    server_name: string | null;
    agent_servers: AgentServerRef[] | null;
    agent_id: string;
    event_type: string;
    occurred_at: string;
    created_at: string;
}

export interface WatchedPathData {
    id: number;
    path: string;
    scope: string;
    server_id: number | null;
    server_uuid: string | null;
    enabled: boolean;
    recursive: boolean;
    exclude_patterns: string[] | null;
    description: string | null;
    created_at: string | null;
    updated_at: string | null;
}

export interface FileActivityFilters {
    server_id?: number;
    server_uuid?: string;
    agent_id?: number;
    action?: string;
    path?: string;
    occurred_at_from?: string;
    occurred_at_to?: string;
    page?: number;
    per_page?: number;
}

export interface LifecycleFilters {
    server_id?: number;
    server_uuid?: string;
    agent_id?: number;
    event_type?: string;
    occurred_at_from?: string;
    occurred_at_to?: string;
    page?: number;
    per_page?: number;
}

export const useWatchedPaths = (scope?: string) => {
    return useQuery<WatchedPathData[]>({
        queryKey: ["watched-paths", scope],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/watched-paths", {
                params: { query: scope ? { scope } : {} },
            });
            if (error) throw error;
            return (data as unknown as WatchedPathData[]) ?? [];
        },
    });
};

export interface WatchedPathInput {
    path: string;
    scope: "agent" | "server";
    server_id?: number | null;
    enabled?: boolean;
    recursive?: boolean;
    exclude_patterns?: string[] | null;
    description?: string | null;
}

export const useCreateWatchedPath = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (input: WatchedPathInput) => {
            const { error } = await api.POST("/v1/watched-paths", {
                body: input,
            });
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["watched-paths"] }),
    });
};

export const useUpdateWatchedPath = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async ({
            id,
            input,
        }: {
            id: number;
            input: Partial<WatchedPathInput>;
        }) => {
            const { error } = await api.PUT("/v1/watched-paths/{id}", {
                params: { path: { id } },
                body: input,
            });
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["watched-paths"] }),
    });
};

export const useDeleteWatchedPath = () => {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: async (id: number) => {
            const { error } = await api.DELETE("/v1/watched-paths/{id}", {
                params: { path: { id } },
            });
            if (error) throw error;
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ["watched-paths"] }),
    });
};
