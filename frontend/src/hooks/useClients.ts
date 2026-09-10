import { useEffect } from "react";
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";
import { getEchoInstance } from "@/hooks/useServerSocket";
import type { ClientData } from "@/types/models";
import type { Paginator } from "@/types/pagination";

// ponytail: /v1/clients returns a Laravel paginator at runtime; api.json
// still declares it as an array, hence the cast below.
export type PaginatedClients = Paginator<ClientData>;

export const useClients = (
    params?: {
        exclude_user_uuid?: string;
        user_uuid?: string;
        available_only?: boolean;
        q?: string;
        filter?: string;
        sort?: string;
        dir?: "asc" | "desc";
        page?: number;
        per_page?: number;
    },
    opts?: { enabled?: boolean },
) => {
    return useQuery<PaginatedClients>({
        queryKey: ["clients", params],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/clients", {
                params: {
                    query: (params
                        ? {
                              ...params,
                              ...(params.available_only !== undefined
                                  ? {
                                        available_only: params.available_only
                                            ? 1
                                            : 0,
                                    }
                                  : {}),
                          }
                        : undefined) as never,
                },
            });
            if (error) throw error;
            return data as unknown as PaginatedClients;
        },
        enabled: opts?.enabled ?? true,
    });
};

export const useInfiniteClients = (
    params?: {
        exclude_user_uuid?: string;
        user_uuid?: string;
        available_only?: boolean;
        q?: string;
        filter?: string;
        sort?: string;
        dir?: "asc" | "desc";
        per_page?: number;
    },
    opts?: { enabled?: boolean },
) => {
    return useInfiniteQuery<PaginatedClients>({
        queryKey: ["clients-infinite", params],
        initialPageParam: 1,
        queryFn: async ({ pageParam = 1 }) => {
            const queryParams = params
                ? {
                      ...params,
                      ...(params.available_only !== undefined
                          ? { available_only: params.available_only ? 1 : 0 }
                          : {}),
                      page: pageParam as number,
                  }
                : { page: pageParam as number };
            const { data, error } = await api.GET("/v1/clients", {
                params: { query: queryParams as never },
            });
            if (error) throw error;
            return data as unknown as PaginatedClients;
        },
        getNextPageParam: (lastPage) => {
            if (lastPage.current_page < lastPage.last_page) {
                return lastPage.current_page + 1;
            }
            return undefined;
        },
        enabled: opts?.enabled ?? true,
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
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!clientUuid) return;

        try {
            const echo = getEchoInstance();
            const channel = echo.private("dashboard");

            const handler = () => {
                queryClient.invalidateQueries({
                    queryKey: ["clients", clientUuid, "servers"],
                });
            };

            channel.listen(".ServerStatusUpdated", handler);
            channel.listen(".RegistrationCompleted", handler);
            channel.listen(".AgentUninstalled", handler);

            return () => {
                channel.stopListening(".ServerStatusUpdated", handler);
                channel.stopListening(".RegistrationCompleted", handler);
                channel.stopListening(".AgentUninstalled", handler);
            };
        } catch {
            // Echo not available yet
        }
    }, [clientUuid, queryClient]);

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
