import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import client, { getCsrfCookie } from "@/api/api";
import type { components } from "@/api/schema.d";

type CoopData = components["schemas"]["CoopData"];

export const useCoops = () => {
    return useQuery({
        queryKey: ["coops"],
        queryFn: async (): Promise<CoopData[]> => {
            const { data, error } = await client.GET("/coops");
            if (error) throw error;
            return data as CoopData[];
        },
    });
};

export const useCoop = (id: number) => {
    return useQuery({
        queryKey: ["coops", id],
        queryFn: async (): Promise<CoopData> => {
            const { data, error } = await client.GET("/coops/{id}", {
                params: { path: { id } },
            });
            if (error) throw error;
            return data as CoopData;
        },
        enabled: !!id,
    });
};

export const useCreateCoop = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formData: FormData) => {
            await getCsrfCookie();
            const { data, error } = await client.POST("/coops", {
                body: formData as never,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["coops"] });
        },
    });
};

export const useUpdateCoop = (id: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (formData: FormData) => {
            await getCsrfCookie();
            const { data, error } = await client.PUT("/coops/{id}", {
                params: { path: { id } },
                body: formData as never,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["coops"] });
            queryClient.invalidateQueries({ queryKey: ["coops", id] });
        },
    });
};

export const useDeleteCoop = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: number) => {
            await getCsrfCookie();
            const { error } = await client.DELETE("/coops/{id}", {
                params: { path: { id } },
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["coops"] });
        },
    });
};
