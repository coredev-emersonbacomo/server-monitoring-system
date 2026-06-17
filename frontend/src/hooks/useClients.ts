import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import client, { getCsrfCookie } from "@/api/api";
import type { components } from "@/api/schema.d";

type ClientData = components["schemas"]["ClientData"];

export const useClients = () => {
    return useQuery({
        queryKey: ["clients"],
        queryFn: async (): Promise<ClientData[]> => {
            const { data, error } = await client.GET("/clients");
            if (error) throw error;
            return data as ClientData[];
        },
    });
};

export const useClient = (id: number) => {
    return useQuery({
        queryKey: ["clients", id],
        queryFn: async (): Promise<ClientData> => {
            const { data, error } = await client.GET("/clients/{id}", {
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
            await getCsrfCookie();
            const { data, error } = await client.POST("/clients", {
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
            await getCsrfCookie();
            const { data, error } = await client.PUT("/clients/{id}", {
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

export const useDeleteClient = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            await getCsrfCookie();
            const { error } = await client.DELETE("/clients/{id}", {
                params: { path: { id } },
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["clients"] });
        },
    });
};
