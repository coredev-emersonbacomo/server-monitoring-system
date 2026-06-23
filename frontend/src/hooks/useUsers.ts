import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import client from "@/api/api";
import type {
    UsersStorePayload as CreateUserPayload,
    UsersUpdatePayload as UpdateUserPayload,
    UserData,
} from "@/types/models";

// ── Queries ──────────────────────────────────────────────────────────────────

export const useUsers = () =>
    useQuery<UserData[]>({
        queryKey: ["users"],
        queryFn: async () => {
            const { data, error } = await client.GET("/users");
            if (error) throw error;
            return data as UserData[];
        },
    });

export const useUser = (id: number | string) =>
    useQuery<UserData>({
        queryKey: ["users", Number(id)],
        queryFn: async () => {
            const { data, error } = await client.GET("/users/{user}", {
                params: { path: { user: Number(id) } },
            });
            if (error) throw error;
            return data as unknown as UserData;
        },
        enabled: !!id,
    });

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation<UserData, unknown, CreateUserPayload>({
        mutationFn: async (payload) => {
            const { data, error } = await client.POST("/users", {
                body: payload as never,
            });
            if (error) throw error;
            return data as unknown as UserData;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
    });
};

export const useUpdateUser = (id: number | string) => {
    const queryClient = useQueryClient();
    return useMutation<UserData, unknown, UpdateUserPayload>({
        mutationFn: async (payload) => {
            const { data, error } = await client.PUT("/users/{user}", {
                params: { path: { user: Number(id) } },
                body: payload as never,
            });
            if (error) throw error;
            return data as unknown as UserData;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["users", Number(id)] });
        },
    });
};

export const useDeleteUser = () => {
    const queryClient = useQueryClient();
    return useMutation<void, unknown, number>({
        mutationFn: async (id) => {
            const { error } = await client.DELETE("/users/{user}", {
                params: { path: { user: id } },
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
    });
};
