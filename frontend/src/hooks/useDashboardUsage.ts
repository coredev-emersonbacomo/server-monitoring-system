import { useEffect } from "react";
import {
    useInfiniteQuery,
    useQueryClient,
    keepPreviousData,
} from "@tanstack/react-query";
import { getEchoInstance } from "@/hooks/useServerSocket";
import { getAccessToken } from "@/api/tokenManager";
import type { UsageData, TimeUnit, MetricKey } from "@/types/dashboard";
import type { InfiniteData } from "@tanstack/react-query";

export function useDashboardUsage(metric: MetricKey, unit: TimeUnit = "hour") {
    const queryClient = useQueryClient();

    const query = useInfiniteQuery<UsageData>({
        queryKey: ["dashboard", "usage", metric, unit],
        queryFn: async ({ pageParam }) => {
            const token = getAccessToken();
            const headers: Record<string, string> = {
                Accept: "application/json",
            };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }
            
            const params = new URLSearchParams({ unit, metric });
            if (pageParam) {
                params.append("before", pageParam as string);
            }

            const res = await fetch(
                `/api/dashboard/usage?${params.toString()}`,
                { credentials: "include", headers },
            );
            if (!res.ok) {
                throw new Error(
                    `Failed to fetch usage data: ${res.status}`,
                );
            }
            return res.json();
        },
        getNextPageParam: (lastPage: UsageData) => lastPage.nextCursor ?? undefined,
        initialPageParam: undefined,
        staleTime: 60_000,
        placeholderData: keepPreviousData,
    });

    useEffect(() => {
        try {
            const echo = getEchoInstance();
            const channel = echo.private("dashboard");

            const handler = (e: UsageData) => {
                if (e.metric === metric && e.unit === unit) {
                    queryClient.setQueryData(
                        ["dashboard", "usage", metric, e.unit],
                        (oldData: InfiniteData<UsageData> | undefined) => {
                            if (!oldData) return { pages: [{ ...e, nextCursor: null }], pageParams: [undefined] };
                            
                            const newPages = [...oldData.pages];
                            if (newPages.length > 0) {
                                // Preserve the cursor so infinite scroll isn't broken
                                const prevCursor = newPages[0].nextCursor;
                                newPages[0] = { ...e, nextCursor: prevCursor ?? null };
                            } else {
                                newPages.push({ ...e, nextCursor: null });
                            }
                            return {
                                ...oldData,
                                pages: newPages,
                            };
                        }
                    );
                }
            };

            channel.listen(".DashboardUsageBroadcast", handler);

            return () => {
                channel.stopListening(".DashboardUsageBroadcast", handler);
            };
        } catch {
            // Echo not available yet
        }
    }, [metric, unit, queryClient]);

    return query;
}
