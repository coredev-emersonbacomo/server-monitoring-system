import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import client, { getCsrfCookie } from "@/api/api";
import type { components } from "@/api/schema.d";

type UserData = components["schemas"]["UserData"];

interface LoginCredentials {
    email: string;
    password: string;
}

export const useAuth = () => {
    return useQuery({
        queryKey: ["auth", "me"],
        queryFn: async (): Promise<UserData | null> => {
            const { data, error, response } = await client.GET("/me");
            if (error) {
                if (response.status === 401) {
                    return null;
                }
                throw error;
            }
            return data ?? null;
        },
        retry: false,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
};

export const useLogin = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (credentials: LoginCredentials) => {
            await getCsrfCookie();
            const { data, error } = await client.POST("/login", {
                body: credentials as never,
            });
            if (error) {
                throw error;
            }
            return data;
        },
        onSuccess: (data) => {
            queryClient.setQueryData(["auth", "me"], data);
        },
    });
};

export const useLogout = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const { error } = await client.POST("/logout");
            if (error) {
                throw error;
            }
        },
        onSuccess: () => {
            queryClient.setQueryData(["auth", "me"], null);
            queryClient.removeQueries(); // Clear all sensitive cached data
        },
    });
};
