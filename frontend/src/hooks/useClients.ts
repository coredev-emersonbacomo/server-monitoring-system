import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";
import type { components } from "@/api/schema.d";

type ClientData = components["schemas"]["ClientData"];

export const useClients = () => {
    return useQuery({
        queryKey: ["clients"],
        queryFn: async (): Promise<ClientData[]> => {
            const { data, error } = await api.GET("/clients");
            if (error) throw error;
            return data as ClientData[];
        },
    });
};

export const useClient = (id: number) => {
    return useQuery({
        queryKey: ["clients", id],
        queryFn: async (): Promise<ClientData> => {
            const { data, error } = await api.GET("/clients/{id}", {
                params: { path: { id } },
            });
            if (error) throw error;
            return data as ClientData;
        },
        enabled: !!id,
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

export const useUpdateClient = (id: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formData: FormData) => {
            const { data, error } = await api.PUT("/clients/{id}", {
                params: { path: { id } },
                body: formData as never,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
            queryClient.invalidateQueries({ queryKey: ["clients", id] });
        },
    });
};

export const useClientServers = (clientId: number) => {
    return useQuery({
        queryKey: ["clients", clientId, "servers"],
        queryFn: async () => {
            const { data, error } = await api.GET("/clients/{id}/servers", {
                params: { path: { id: clientId } },
            });
            if (error) throw error;
            return data;
        },
        enabled: !!clientId,
    });
};

export const useDeleteClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            const { error } = await api.DELETE("/clients/{id}", {
                params: { path: { id } },
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
        },
    });
};

export const useClientSecops = (clientId: number) => {
    return useQuery({
        queryKey: ["clients", clientId, "secops"],
        queryFn: async () => {
            const { data, error } = await api.GET("/clients/{id}/secops", {
                params: { path: { id: clientId } },
            });
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!clientId,
    });
};

export const useAddClientSecop = (clientId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: number) => {
            const { data, error } = await api.POST("/clients/{id}/secops", {
                params: { path: { id: clientId } },
                body: { user_id: userId },
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients", clientId, "secops"] });
            queryClient.invalidateQueries({ queryKey: ["clients", clientId] });
        },
    });
};

export const useRemoveClientSecop = (clientId: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (userId: number) => {
            const { error } = await api.DELETE("/clients/{id}/secops/{userId}", {
                params: { path: { id: clientId, userId } },
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients", clientId, "secops"] });
            queryClient.invalidateQueries({ queryKey: ["clients", clientId] });
        },
    });
};
