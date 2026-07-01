import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";
import type { components } from "@/api/schema.d";

export const useClients = () => {
    return useQuery({
        queryKey: ["clients"],
        queryFn: async () => {
            const { data, error } = await api.GET("/clients");
            if (error) throw error;
            return data;
        },
    });
};

export const useClient = (clientUuid: string) => {
    return useQuery({
        queryKey: ["clients", clientUuid],
        queryFn: async (): Promise<components["schemas"]["ClientData"]> => {
            const { data, error } = await api.GET("/clients/{uuid}", {
                params: { path: { uuid: clientUuid } },
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
            const { data, error } = await api.POST("/clients", {
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
            const { data, error } = await api.PUT("/clients/{uuid}", {
                params: { path: { uuid: clientUuid } },
                body: formData as never,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            queryClient.invalidateQueries({ queryKey: ["clients", clientUuid] });
        },
    });
};

export const useClientServers = (clientUuid: string) => {
    return useQuery({
        queryKey: ["clients", clientUuid, "servers"],
        queryFn: async (): Promise<components["schemas"]["ServerData"][]> => {
            const { data, error } = await api.GET("/clients/{client}/servers", {
                params: { path: { client: clientUuid } },
            });
            if (error) throw error;
            return data as components["schemas"]["ServerData"][];
        },
        enabled: !!clientUuid,
    });
};

export const useDeleteClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (clientUuid: string) => {
            const { error } = await api.DELETE("/clients/{uuid}", {
                params: { path: { uuid: clientUuid } },
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
        queryFn: async (): Promise<components["schemas"]["SecopsUserData"][]> => {
            const { data, error } = await api.GET("/clients/{client}/secops", {
                params: { path: { client: clientUuid } },
            });
            if (error) throw error;
            return (data ?? []) as components["schemas"]["SecopsUserData"][];
        },
        enabled: !!clientUuid,
    });
};

export const useAddClientSecop = (clientUuid: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: number) => {
            const { data, error } = await api.POST("/clients/{client}/secops", {
                params: { path: { client: clientUuid } },
                body: { user_id: userId },
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients", clientUuid, "secops"] });
            queryClient.invalidateQueries({ queryKey: ["clients", clientUuid] });
        },
    });
};

export const useRemoveClientSecop = (clientUuid: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: number) => {
            const { error } = await api.DELETE("/clients/{client}/secops/{userId}", {
                params: { path: { client: clientUuid, userId } },
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients", clientUuid, "secops"] });
            queryClient.invalidateQueries({ queryKey: ["clients", clientUuid] });
        },
    });
};
