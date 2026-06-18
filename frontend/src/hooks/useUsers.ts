import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCsrfCookie } from "@/api/api";
import type { User, UsersStorePayload as CreateUserPayload, UsersUpdatePayload as UpdateUserPayload } from "@/types/models";

type FullUser = User & { role?: { role_name: string }, status?: "active" | "inactive", avatar?: string };

const API_BASE = "/api";

async function apiFetch<T>(
    url: string,
    options?: RequestInit,
): Promise<T> {
    const res = await fetch(url, {
        headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...options?.headers,
        },
        credentials: "include",
        ...options,
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw data;
    }
    if (res.status === 204) return undefined as T;
    return res.json();
}

// ── Queries ──────────────────────────────────────────────────────────────────

export const useUsers = () =>
    useQuery<FullUser[]>({
        queryKey: ["users"],
        queryFn: () => apiFetch<FullUser[]>(`${API_BASE}/users`),
    });

export const useUser = (id: number | string) =>
    useQuery<FullUser>({
        queryKey: ["users", Number(id)],
        queryFn: () => apiFetch<FullUser>(`${API_BASE}/users/${id}`),
        enabled: !!id,
    });

// ── Mutations ─────────────────────────────────────────────────────────────────

export const useCreateUser = () => {
    const queryClient = useQueryClient();
    return useMutation<FullUser, unknown, CreateUserPayload>({
        mutationFn: async (payload) => {
            await getCsrfCookie();
            return apiFetch<FullUser>(`${API_BASE}/users`, {
                method: "POST",
                body: JSON.stringify(payload),
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
    });
};

export const useUpdateUser = (id: number | string) => {
    const queryClient = useQueryClient();
    return useMutation<FullUser, unknown, UpdateUserPayload>({
        mutationFn: async (payload) => {
            await getCsrfCookie();
            return apiFetch<FullUser>(`${API_BASE}/users/${id}`, {
                method: "PUT",
                body: JSON.stringify(payload),
            });
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
            await getCsrfCookie();
            return apiFetch<void>(`${API_BASE}/users/${id}`, {
                method: "DELETE",
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["users"] });
        },
    });
};
