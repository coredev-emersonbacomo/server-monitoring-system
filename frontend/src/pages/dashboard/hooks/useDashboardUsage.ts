import { useEffect } from "react";
import {
    useInfiniteQuery,
    useQueryClient,
    keepPreviousData,
} from "@tanstack/react-query";
import { getEchoInstance } from "@/hooks/useServerSocket";
import { getAccessToken } from "@/api/tokenManager";
import type { UsageData, TimeUnit, MetricKey, UsageScope } from "@/types/dashboard";
import type { InfiniteData } from "@tanstack/react-query";

export function useDashboardUsage(
    metric: MetricKey,
    unit: TimeUnit = "hour",
    scope: UsageScope = "all",
    serverUuid?: string,
) {
    const queryClient = useQueryClient();
    const scopeKey = `${scope}:${serverUuid ?? "all"}`;

    const query = useInfiniteQuery<UsageData>({
        queryKey: ["dashboard", "usage", metric, unit, scopeKey],
        queryFn: async ({ pageParam }) => {
            const token = getAccessToken();
            const headers: Record<string, string> = {
                Accept: "application/json",
            };
            if (token) {
                headers["Authorization"] = `Bearer ${token}`;
            }

            const params = new URLSearchParams({ unit, metric, scope });
            if (serverUuid) {
                params.append("server_uuid", serverUuid);
            }
            if (pageParam) {
                params.append("before", pageParam as string);
            }

            const res = await fetch(
                `/api/v1/dashboard/usage?${params.toString()}`,
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
                if (e.metric !== metric || e.unit !== unit || e.scope !== scope) {
                    return;
                }

                // Compare mode: merge just the broadcast server's series into
                // every cached "server:" query that includes that server.
                if (e.scope === "server") {
                    const evUuid = e.series[0]?.server_uuid;
                    if (!evUuid) return;
                    const matches = queryClient
                        .getQueryCache()
                        .findAll({
                            queryKey: ["dashboard", "usage", metric, unit],
                            exact: false,
                        })
                        .filter((m) =>
                            typeof m.queryKey[4] === "string" &&
                            (m.queryKey[4] as string).startsWith("server:"),
                        );
                    for (const m of matches) {
                        const key = m.queryKey[4] as string;
                        const uuids = key
                            .slice("server:".length)
                            .split(",")
                            .filter(Boolean);
                        if (!uuids.includes(evUuid)) continue;
                        queryClient.setQueryData(
                            ["dashboard", "usage", metric, unit, key],
                            (oldData: InfiniteData<UsageData> | undefined) => {
                                if (!oldData) return undefined;
                                const newPages = [...oldData.pages];
                                if (newPages.length > 0) {
                                    const prevCursor = newPages[0].nextCursor;
                                    newPages[0] = {
                                        ...newPages[0],
                                        nextCursor: prevCursor ?? null,
                                        series: newPages[0].series.map((s) =>
                                            s.server_uuid === evUuid
                                                ? { ...s, points: e.series[0].points }
                                                : s,
                                        ),
                                    };
                                }
                                return { ...oldData, pages: newPages };
                            },
                        );
                    }
                    return;
                }

                // all / avg: wholesale replace the first page
                const evKey = [
                    "dashboard",
                    "usage",
                    e.metric,
                    e.unit,
                    `${e.scope}:all`,
                ];
                queryClient.setQueryData(
                    evKey,
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
            };

            channel.listen(".DashboardUsageBroadcast", handler);

            return () => {
                channel.stopListening(".DashboardUsageBroadcast", handler);
            };
        } catch {
            // Echo not available yet
        }
    }, [metric, unit, scope, scopeKey, serverUuid, queryClient]);

    return query;
}
