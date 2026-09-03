import type {
    NodeConfig,
    NodeConfigGraph,
    NodeTypeDefinition,
} from "@/types/node-config";

export function useConfigs() {
    return { data: [] as NodeConfig[], isLoading: false };
}

export function useConfig(_id: number | null) {
    return { data: undefined, isLoading: false };
}

export function useNodeTypes() {
    return { data: [] as NodeTypeDefinition[], isLoading: false };
}

export function useCreateConfig() {
    return { mutate: (..._args: any[]) => {}, mutateAsync: async (..._args: any[]) => {}, isPending: false };
}

export function useUpdateConfig() {
    return { mutate: (..._args: any[]) => {}, mutateAsync: async (..._args: any[]) => {}, isPending: false };
}

export function useDeleteConfig() {
    return { mutate: (..._args: any[]) => {}, mutateAsync: async (..._args: any[]) => {}, isPending: false };
}

export function useTestConfig() {
    return { mutate: (..._args: any[]) => {}, mutateAsync: async (..._args: any[]) => {}, isPending: false };
}

export function useResetConfigState() {
    return { mutate: (..._args: any[]) => {}, mutateAsync: async (..._args: any[]) => {}, isPending: false };
}

export function useConfigByKey(_slug: string | null) {
    return { data: undefined, isLoading: false };
}

export function useUpsertConfigByKey() {
    return { mutate: (..._args: any[]) => {}, mutateAsync: async (..._args: any[]) => {}, isPending: false };
}

export function usePreviewConfig() {
    return { mutate: (..._args: any[]) => {}, mutateAsync: async (..._args: any[]) => {}, isPending: false };
}
