import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";
import type {
    NodeConfig,
    NodeConfigGraph,
    NodeTypeDefinition,
} from "@/types/node-config";

async function fetchConfigs(): Promise<NodeConfig[]> {
    const res = await api.GET("/v1/node-configs");
    if (res.error) throw new Error("Failed to fetch node configs");
    return res.data as unknown as NodeConfig[];
}

async function fetchConfig(id: number): Promise<NodeConfig> {
    const res = await api.GET("/v1/node-configs/{id}", {
        params: { path: { id } },
    });
    if (res.error) throw new Error("Failed to fetch node config");
    return res.data as unknown as NodeConfig;
}

async function createConfig(data: {
    name: string;
    description?: string;
    config: NodeConfigGraph;
    enabled?: boolean;
}): Promise<NodeConfig> {
    const res = await api.POST("/v1/node-configs", {
        body: data as never,
    });
    if (res.error) throw new Error("Failed to create node config");
    return res.data as unknown as NodeConfig;
}

async function updateConfig(
    id: number,
    data: {
        name: string;
        description?: string;
        config: NodeConfigGraph;
        enabled?: boolean;
    },
): Promise<NodeConfig> {
    const res = await api.PUT("/v1/node-configs/{id}", {
        params: { path: { id } },
        body: data as never,
    });
    if (res.error) throw new Error("Failed to update node config");
    return res.data as unknown as NodeConfig;
}

async function deleteConfig(id: number): Promise<void> {
    const res = await api.DELETE("/v1/node-configs/{id}", {
        params: { path: { id } },
    });
    if (res.error) throw new Error("Failed to delete node config");
}

async function toggleConfig(id: number): Promise<NodeConfig> {
    const res = await api.POST("/v1/node-configs/{id}/toggle", {
        params: { path: { id } },
    } as never);
    if (res.error) throw new Error("Failed to toggle node config");
    return res.data as unknown as NodeConfig;
}

async function testConfig(
    id: number,
    sourceNodeId: string,
    value: unknown,
    extraState?: Record<string, unknown>,
) {
    const res = await api.POST("/v1/node-configs/{id}/test", {
        params: { path: { id } },
        body: {
            source_node_id: sourceNodeId,
            value,
            extra_state: extraState,
        } as never,
    });
    if (res.error) throw new Error("Test failed");
    return res.data;
}

async function resetConfigState(id: number): Promise<void> {
    const res = await api.POST("/v1/node-configs/{id}/reset-state", {
        params: { path: { id } },
    } as never);
    if (res.error) throw new Error("Failed to reset state");
}

async function fetchNodeTypes(): Promise<NodeTypeDefinition[]> {
    const res = await api.GET("/v1/node-config-node-types");
    if (res.error) throw new Error("Failed to fetch node types");
    return res.data as unknown as NodeTypeDefinition[];
}

async function fetchConfigBySlug(slug: string): Promise<NodeConfig> {
    const res = await api.GET("/v1/node-configs/by-slug/{slug}", {
        params: { path: { slug } },
    });
    if (res.error) throw new Error("Failed to fetch node config");
    return res.data as unknown as NodeConfig;
}

async function upsertConfigBySlug(
    slug: string,
    data: {
        name: string;
        config: NodeConfigGraph;
        enabled?: boolean;
    },
): Promise<NodeConfig> {
    const res = await api.PUT("/v1/node-configs/by-slug/{slug}", {
        params: { path: { slug } },
        body: data as never,
    });
    if (res.error) throw new Error("Failed to save node config");
    return res.data as unknown as NodeConfig;
}

async function previewConfig(
    config: NodeConfigGraph,
): Promise<unknown> {
    const res = await api.POST("/v1/node-configs/preview", {
        body: { config } as never,
    });
    if (res.error) throw new Error("Failed to compile config");
    return res.data;
}

export function useConfigs() {
    return useQuery({
        queryKey: ["node-configs"],
        queryFn: fetchConfigs,
    });
}

export function useConfig(id: number | null) {
    return useQuery({
        queryKey: ["node-config", id],
        queryFn: () => fetchConfig(id!),
        enabled: id !== null,
    });
}

export function useNodeTypes() {
    return useQuery({
        queryKey: ["node-types"],
        queryFn: fetchNodeTypes,
        staleTime: Infinity,
    });
}

export function useCreateConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createConfig,
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ["node-configs"] }),
    });
}

export function useUpdateConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            id,
            data,
        }: {
            id: number;
            data: {
                name: string;
                description?: string;
                config: NodeConfigGraph;
                enabled?: boolean;
            };
        }) => updateConfig(id, data),
        onSuccess: (result) => {
            queryClient.invalidateQueries({ queryKey: ["node-configs"] });
            queryClient.invalidateQueries({
                queryKey: ["node-config", result.id],
            });
        },
    });
}

export function useDeleteConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteConfig,
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ["node-configs"] }),
    });
}

export function useToggleConfig() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: toggleConfig,
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ["node-configs"] }),
    });
}

export function useTestConfig() {
    return useMutation({
        mutationFn: ({
            id,
            sourceNodeId,
            value,
            extraState,
        }: {
            id: number;
            sourceNodeId: string;
            value: unknown;
            extraState?: Record<string, unknown>;
        }) => testConfig(id, sourceNodeId, value, extraState),
    });
}

export function useResetConfigState() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: resetConfigState,
        onSuccess: () =>
            queryClient.invalidateQueries({ queryKey: ["node-config"] }),
    });
}

export function useConfigByKey(slug: string | null) {
    return useQuery({
        queryKey: ["node-config-by-slug", slug],
        queryFn: () => fetchConfigBySlug(slug!),
        enabled: slug !== null,
    });
}

export function useUpsertConfigByKey() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({
            slug,
            data,
        }: {
            slug: string;
            data: {
                name: string;
                config: NodeConfigGraph;
                enabled?: boolean;
            };
        }) => upsertConfigBySlug(slug, data),
        onSuccess: (_result, variables) => {
            queryClient.invalidateQueries({
                queryKey: ["node-config-by-slug", variables.slug],
            });
        },
    });
}

export function usePreviewConfig() {
    return useMutation({
        mutationFn: ({ config }: { config: NodeConfigGraph }) =>
            previewConfig(config),
    });
}
