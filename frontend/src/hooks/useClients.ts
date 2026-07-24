import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";

export const useClients = (params?: {
    exclude_user_uuid?: string;
    user_uuid?: string;
    available_only?: boolean;
}) => {
    return useQuery({
        queryKey: ["clients", params],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/clients", {
                params: {
                    query: params,
                },
            });
            if (error) throw error;
            return data;
        },
    });
};

export const useClient = (clientUuid: string) => {
    return useQuery({
        queryKey: ["clients", clientUuid],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/clients/{clientUuid}", {
                params: { path: { clientUuid } },
            });
            if (error) throw error;
            return data;
        },
        enabled: !!clientUuid,
    });
};

export const useCreateClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formData: FormData) => {
            const { data, error } = await api.POST("/v1/clients", {
                body: formData as never,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
        },
    });
};

export const useUpdateClient = (clientUuid: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formData: FormData) => {
            const { data, error } = await api.PUT("/v1/clients/{clientUuid}", {
                params: { path: { clientUuid } },
                body: formData as never,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            queryClient.invalidateQueries({
                queryKey: ["clients", clientUuid],
            });
        },
    });
};

export const useClientServers = (clientUuid: string) => {
    return useQuery({
        queryKey: ["clients", clientUuid, "servers"],
        queryFn: async () => {
            const { data, error } = await api.GET(
                "/v1/clients/{clientUuid}/servers",
                {
                    params: { path: { clientUuid } },
                },
            );
            if (error) throw error;
            return data;
        },
        enabled: !!clientUuid,
    });
};

export const useDeleteClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (clientUuid: string) => {
            const { error } = await api.DELETE("/v1/clients/{clientUuid}", {
                params: { path: { clientUuid } },
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
        },
    });
};

export const useClientSecops = (clientUuid: string) => {
    return useQuery({
        queryKey: ["clients", clientUuid, "secops"],
        queryFn: async () => {
            const { data, error } = await api.GET(
                "/v1/clients/{clientUuid}/secops",
                {
                    params: { path: { clientUuid } },
                },
            );
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!clientUuid,
    });
};

export const useAddClientSecop = (clientUuid: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userUuid: string) => {
            const { data, error } = await api.POST(
                "/v1/clients/{clientUuid}/secops",
                {
                    params: { path: { clientUuid } },
                    body: { user_uuid: userUuid },
                },
            );
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["clients", clientUuid, "secops"],
            });
            queryClient.invalidateQueries({
                queryKey: ["clients", clientUuid],
            });
        },
    });
};

export const useRemoveClientSecop = (clientUuid: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userUuid: string) => {
            const { error } = await api.DELETE(
                "/v1/clients/{clientUuid}/secops/{userUuid}",
                {
                    params: { path: { clientUuid, userUuid } },
                },
            );
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["clients", clientUuid, "secops"],
            });
            queryClient.invalidateQueries({
                queryKey: ["clients", clientUuid],
            });
        },
    });
};
