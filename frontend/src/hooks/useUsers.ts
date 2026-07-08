import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";
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
            const { data, error } = await api.GET("/users");
            if (error) throw error;
            return data;
        },
    });

export const useUser = (uuid: string) =>
    useQuery<UserData>({
        queryKey: ["users", uuid],
        queryFn: async () => {
            const { data, error } = await api.GET("/users/{user}", {
                params: { path: { user: uuid } },
            });
            if (error) throw error;
            return data;
        },
        enabled: !!uuid,
    });

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation<unknown, unknown, CreateUserPayload>({
        mutationFn: async (payload) => {
            const {  error } = await api.POST("/users", {
                body: payload as never,
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
    });
};

export const useUpdateUser = (uuid: string) => {
    const queryClient = useQueryClient();
    return useMutation<UserData, unknown, UpdateUserPayload>({
        mutationFn: async (payload) => {
            const { data, error } = await api.PUT("/users/{user}", {
                params: { path: { user: uuid } },
                body: payload,
            });
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
            queryClient.invalidateQueries({ queryKey: ["users", uuid] });
        },
    });
};

export const useDeleteUser = () => {
    const queryClient = useQueryClient();
    return useMutation<void, unknown, string>({
        mutationFn: async (uuid) => {
            const { error } = await api.DELETE("/users/{user}", {
                params: { path: { user: uuid } },
            });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
    });
};

export const useUserClients = (userUuid: string) => {
    return useQuery({
        queryKey: ["users", userUuid, "clients"],
        queryFn: async () => {
            const { data, error } = await api.GET(
                "/users/{userUuid}/clients",
                {
                    params: { path: { userUuid } },
                },
            );
            if (error) throw error;
            return data ?? [];
        },
        enabled: !!userUuid,
    });
};

export const useAddUserClient = (userUuid: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (clientUuid: string) => {
            const { data, error } = await api.POST(
                "/users/{userUuid}/clients",
                {
                    params: { path: { userUuid } },
                    body: { client_uuid: clientUuid },
                },
            );
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["users", userUuid, "clients"],
            });
            queryClient.invalidateQueries({
                queryKey: ["users", userUuid],
            });
        },
    });
};

export const useRemoveUserClient = (userUuid: string) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (clientUuid: string) => {
            const { error } = await api.DELETE(
                "/users/{userUuid}/clients/{clientUuid}",
                {
                    params: { path: { userUuid, clientUuid } },
                },
            );
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({
                queryKey: ["users", userUuid, "clients"],
            });
            queryClient.invalidateQueries({
                queryKey: ["users", userUuid],
            });
        },
    });
};
