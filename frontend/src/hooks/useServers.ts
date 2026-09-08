import { useEffect } from "react";
import { useQuery, useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";
import { getEchoInstance } from "@/hooks/useServerSocket";
import type { ServerData } from "@/types/models";
import type { Paginator } from "@/types/pagination";

export const useServers = (params?: {
    client_uuid?: string;
    client_uuids?: string;
    q?: string;
    status?: string;
    sort?: string;
    dir?: "asc" | "desc";
    page?: number;
    per_page?: number;
}) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        try {
            const echo = getEchoInstance();
            const channel = echo.private("dashboard");

            const handler = () => {
                queryClient.invalidateQueries({ queryKey: ["servers"] });
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
    }, [queryClient]);

    return useQuery<Paginator<ServerData>>({
        queryKey: ["servers", params],
        queryFn: async () => {
            const { data, error } = await api.GET("/v1/servers", {
                params: { query: (params ?? undefined) as never },
            });
            if (error) throw error;
            return data as unknown as Paginator<ServerData>;
        },
    });
};

export const useInfiniteServers = (params?: {
    client_uuid?: string;
    client_uuids?: string;
    q?: string;
    status?: string;
    sort?: string;
    dir?: "asc" | "desc";
    per_page?: number;
}) => {
    const queryClient = useQueryClient();

    useEffect(() => {
        try {
            const echo = getEchoInstance();
            const channel = echo.private("dashboard");

            const handler = () => {
                queryClient.invalidateQueries({ queryKey: ["servers-infinite"] });
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
    }, [queryClient]);

    return useInfiniteQuery<Paginator<ServerData>>({
        queryKey: ["servers-infinite", params],
        queryFn: async ({ pageParam = 1 }) => {
            const queryParams = {
                ...(params ?? {}),
                page: pageParam as number,
            };
            const { data, error } = await api.GET("/v1/servers", {
                params: { query: queryParams as never },
            });
            if (error) throw error;
            return data as unknown as Paginator<ServerData>;
        },
        initialPageParam: 1,
        getNextPageParam: (lastPage) => {
            if (lastPage.current_page < lastPage.last_page) {
                return lastPage.current_page + 1;
            }
            return undefined;
        },
    });
};

