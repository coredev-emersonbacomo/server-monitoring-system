import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import PageLayout from "@/components/PageLayout";
import {
    Server,
    Wifi,
    WifiOff,
    AlertTriangle,
    Trash2,
    UserCheck,
    Landmark,
    ExternalLink,
    Loader2,
} from "lucide-react";
import { useServers, useInfiniteServers } from "@/hooks/useServers";
import { useUrlState } from "@/hooks/useUrlState";
import { useDashboardStats } from "@/pages/dashboard/hooks/useDashboard";
import IndexToolbar from "@/components/IndexToolbar";
import type { SortOption } from "@/components/IndexToolbar";
import IndexHeader from "@/components/IndexHeader";
import { SelectClientDialog } from "./components/SelectClientDialog";
import { MultiSelectClientsDialog } from "./components/MultiSelectClientsDialog";
import { ServerCard, SkeletonGrid } from "./components/ServerCard";
import type { ServerData } from "@/types/models";

export default function ServersIndex() {
    useDocumentTitle("Servers");
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const statusFilter = searchParams.get("status");
    const clientUuid = searchParams.get("client_uuid") || undefined;
    const clientsParam = searchParams.get("clients") || undefined;

    // Array of selected client UUIDs from searchParams
    const selectedClientUuids = useMemo(() => {
        if (clientsParam) {
            return clientsParam.split(",").filter(Boolean);
        }
        if (clientUuid) {
            return [clientUuid];
        }
        return [];
    }, [clientsParam, clientUuid]);

    const isGroupedByClient =
        selectedClientUuids.length > 0 || searchParams.get("view") === "client";

    // Dialog state
    const [showCreateClientPicker, setShowCreateClientPicker] = useState(false);
    const [showMultiClientPicker, setShowMultiClientPicker] = useState(false);

    const [s, setS] = useUrlState({
        q: { default: "" },
        sort: { default: "created_at" },
        dir: { default: "desc" as "asc" | "desc" },
    });

    // Global dashboard stats for consistent filter counts
    const { data: stats } = useDashboardStats();

    // Base query without status filter to calculate counts for all filter badges based on selected client(s)
    const { data: baseResponse } = useServers({
        client_uuid: selectedClientUuids.length === 1 ? selectedClientUuids[0] : undefined,
        client_uuids: selectedClientUuids.length > 1 ? selectedClientUuids.join(",") : undefined,
        q: s.q || undefined,
        per_page: 200,
    });
    const baseServers = useMemo(() => baseResponse?.data ?? [], [baseResponse]);

    // Infinite servers query
    const {
        data: infiniteData,
        isLoading,
        isFetchingNextPage,
        hasNextPage,
        fetchNextPage,
    } = useInfiniteServers({
        client_uuid: selectedClientUuids.length === 1 ? selectedClientUuids[0] : undefined,
        client_uuids: selectedClientUuids.length > 1 ? selectedClientUuids.join(",") : undefined,
        q: s.q || undefined,
        status: statusFilter || undefined,
        sort: s.sort,
        dir: s.dir,
        per_page: 50,
    });

    const servers = useMemo(() => {
        if (!infiniteData?.pages) return [];
        // Dedupe by uuid: page boundaries shift on background refetch when
        // rows change server-side, and duplicates break React keys (rows
        // render twice / go missing).
        const seen = new Set<string>();
        const out: ServerData[] = [];
        for (const page of infiniteData.pages) {
            for (const server of page.data ?? []) {
                if (seen.has(server.uuid)) continue;
                seen.add(server.uuid);
                out.push(server);
            }
        }
        return out;
    }, [infiniteData]);

    // IntersectionObserver sentinel for automatic infinite scrolling
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const el = loadMoreRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage();
                }
            },
            { rootMargin: "300px" },
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const sortOptions = [
        { label: "Created At", value: "created_at" },
        { label: "Server Name", value: "name" },
        { label: "Record Status", value: "record_status" },
    ];
    const currentSortLabel =
        sortOptions.find((o) => o.value === s.sort)?.label ?? "";

    const clientName = useMemo(() => {
        if (servers.length === 0) return null;
        return servers[0].client_name;
    }, [servers]);

    const groupedServers = useMemo(() => {
        if (!isGroupedByClient) return [];
        const groupOrder: string[] = [];
        const groups: Record<
            string,
            {
                client_name: string;
                client_uuid: string;
                servers: ServerData[];
            }
        > = {};

        for (const server of servers) {
            const key = server.client_uuid || "unassigned";
            if (!groups[key]) {
                groupOrder.push(key);
                groups[key] = {
                    client_name: server.client_name || "Unassigned Client",
                    client_uuid: server.client_uuid || "",
                    servers: [],
                };
            }
            groups[key].servers.push(server);
        }

        // Preserve arrival order so newly fetched clients on scroll appear at the bottom
        return groupOrder.map((key) => groups[key]);
    }, [isGroupedByClient, servers]);

    // Reliable server status counts: static based on selected client(s) and their servers across all statuses
    const counts = useMemo(() => {
        const targetServers = baseServers.length > 0 ? baseServers : servers;

        // When no client filter is applied and global stats exist, use stats for global counts
        if (selectedClientUuids.length === 0 && stats && !s.q) {
            return {
                all: stats.total_servers ?? 0,
                assigned: targetServers.filter((srv) =>
                    Boolean(srv.is_assigned_to_current_user),
                ).length,
                online: stats.online_count ?? 0,
                warning: 0,
                offline: stats.offline_count ?? 0,
                pending_installation: stats.pending_installation_count ?? 0,
                waiting_for_installation: stats.waiting_for_installation_count ?? 0,
                pending_deletion: stats.pending_deletion_count ?? 0,
                agent_uninstalled: stats.agent_uninstalled_count ?? 0,
                archived: 0,
            };
        }

        const activeServers = targetServers.filter(
            (srv) => srv.record_status !== "archived" && srv.status !== "archived",
        );

        return {
            all: activeServers.length,
            assigned: activeServers.filter((srv) =>
                Boolean(srv.is_assigned_to_current_user),
            ).length,
            online: activeServers.filter(
                (srv) => srv.status === "online" && !srv.agent_deleted,
            ).length,
            warning: activeServers.filter(
                (srv) => srv.status === "warning" && !srv.agent_deleted,
            ).length,
            offline: activeServers.filter(
                (srv) => srv.status === "offline" && !srv.agent_deleted,
            ).length,
            pending_installation: activeServers.filter(
                (srv) =>
                    (srv.status === "pending_installation" ||
                        srv.status === "waiting_for_first_heartbeat" ||
                        !srv.status) &&
                    !srv.agent_deleted,
            ).length,
            waiting_for_installation: activeServers.filter(
                (srv) =>
                    srv.status === "waiting_for_installation" && !srv.agent_deleted,
            ).length,
            pending_deletion: activeServers.filter((srv) => srv.agent_deleted).length,
            agent_uninstalled: activeServers.filter(
                (srv) => srv.status === "agent_uninstalled",
            ).length,
            archived: targetServers.filter(
                (srv) => srv.record_status === "archived" || srv.status === "archived",
            ).length,
        };
    }, [selectedClientUuids, stats, s.q, baseServers, servers]);

    const handleApplyClientFilter = (selectedUuids: string[]) => {
        const next = new URLSearchParams(searchParams);
        if (selectedUuids.length === 0) {
            next.delete("clients");
            next.delete("client_uuid");
            next.delete("view");
        } else if (selectedUuids.length === 1) {
            next.set("client_uuid", selectedUuids[0]);
            next.delete("clients");
            next.set("view", "client");
        } else {
            next.set("clients", selectedUuids.join(","));
            next.delete("client_uuid");
            next.set("view", "client");
        }
        setSearchParams(next);
    };

    const handleClearClientFilter = () => {
        const next = new URLSearchParams(searchParams);
        next.delete("clients");
        next.delete("client_uuid");
        next.delete("view");
        setSearchParams(next);
    };

    const viewByClientButtonLabel = useMemo(() => {
        if (selectedClientUuids.length === 1 && clientName) {
            return clientName;
        }
        if (selectedClientUuids.length > 1) {
            return `${selectedClientUuids.length} Clients Selected`;
        }
        if (isGroupedByClient) {
            return "All Clients";
        }
        return "View by Client";
    }, [selectedClientUuids, clientName, isGroupedByClient]);

    return (
        <PageLayout>
            <IndexHeader
                icon={Server}
                title={
                    selectedClientUuids.length === 1 && clientName
                        ? `${clientName} Servers`
                        : selectedClientUuids.length > 1
                          ? `Servers (${selectedClientUuids.length} Clients)`
                          : isGroupedByClient
                            ? "Servers by Client"
                            : "Servers"
                }
                description={
                    selectedClientUuids.length === 1 && clientName
                        ? `Manage ${clientName}'s servers.`
                        : isGroupedByClient
                          ? "Browse and manage servers organized by client organization."
                          : "Manage all servers."
                }
            />

            <main className="w-full flex-1 min-h-0 flex flex-col gap-5">
                <IndexToolbar
                    searchParamName="q"
                    searchDebounceMs={300}
                    searchPlaceholder="Search servers…"
                    filterOptions={[
                        {
                            label: "All",
                            value: "",
                            count: counts.all,
                        },
                        {
                            label: "Assigned to Me",
                            value: "assigned",
                            count: counts.assigned,
                            icon: <UserCheck className="size-3 text-primary" />,
                        },
                        {
                            label: "Online",
                            value: "online",
                            count: counts.online,
                            icon: <Wifi className="size-3 text-emerald-400" />,
                        },
                        {
                            label: "Offline",
                            value: "offline",
                            count: counts.offline,
                            icon: <WifiOff className="size-3 text-red-400" />,
                        },
                        {
                            label: "Pending Installation",
                            value: "pending_installation",
                            count: counts.pending_installation,
                            icon: (
                                <AlertTriangle className="size-3 text-slate-400" />
                            ),
                        },
                        {
                            label: "Waiting For Installation",
                            value: "waiting_for_installation",
                            count: counts.waiting_for_installation,
                            icon: (
                                <AlertTriangle className="size-3 text-amber-400 animate-pulse" />
                            ),
                        },
                        {
                            label: "Pending Deletion",
                            value: "pending_deletion",
                            count: counts.pending_deletion ?? 0,
                            icon: <Trash2 className="size-3 text-orange-400" />,
                        },
                        {
                            label: "Agent Uninstalled",
                            value: "agent_uninstalled",
                            count: counts.agent_uninstalled ?? 0,
                            icon: <WifiOff className="size-3 text-red-400" />,
                        },
                        {
                            label: "Archived",
                            value: "archived",
                            count: counts.archived,
                            icon: <Trash2 className="size-3 text-slate-400" />,
                        },
                    ]}
                    filter={statusFilter ?? ""}
                    onFilterChange={(value) => {
                        const next = new URLSearchParams(searchParams);
                        if (value) {
                            next.set("status", value);
                        } else {
                            next.delete("status");
                        }
                        setSearchParams(next);
                    }}
                    filterLabel={
                        statusFilter
                            ? statusFilter === "assigned"
                                ? "Assigned to Me"
                                : statusFilter === "pending_installation"
                                  ? "Pending Installation"
                                  : statusFilter === "waiting_for_installation"
                                    ? "Waiting For Installation"
                                    : statusFilter.charAt(0).toUpperCase() +
                                      statusFilter.slice(1)
                            : "All"
                    }
                    sortOptions={sortOptions as SortOption[]}
                    sortField={s.sort}
                    onSortFieldChange={(v) => setS({ sort: v })}
                    sortDir={s.dir}
                    onSortDirChange={() =>
                        setS({ dir: s.dir === "desc" ? "asc" : "desc" })
                    }
                    sortLabel={currentSortLabel}
                    onCreate={() =>
                        selectedClientUuids.length === 1
                            ? navigate(
                                  `/servers/create?client_uuid=${selectedClientUuids[0]}`,
                              )
                            : setShowCreateClientPicker(true)
                    }
                    createLabel="Add server"
                    onViewByClient={() => setShowMultiClientPicker(true)}
                    isViewByClientActive={isGroupedByClient}
                    viewByClientLabel={viewByClientButtonLabel}
                    onClearViewByClient={
                        isGroupedByClient ? handleClearClientFilter : undefined
                    }
                />

                {isLoading ? (
                    <SkeletonGrid />
                ) : servers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                        <Server size={40} className="opacity-20" />
                        <p className="text-sm font-medium">
                            {s.q || statusFilter
                                ? "No servers match your search."
                                : "No servers yet."}
                        </p>
                        <p className="text-xs opacity-60">
                            {s.q || statusFilter
                                ? "Try adjusting your filters or search term."
                                : "Add your first server to get started."}
                        </p>
                    </div>
                ) : isGroupedByClient ? (
                    <div className="flex flex-col gap-8 pt-2">
                        {groupedServers.map((group) => (
                            <section
                                key={group.client_uuid || group.client_name}
                                className="flex flex-col gap-3 rounded-xl border border-border/60 bg-card/40 p-5 shadow-xs"
                            >
                                <div className="flex items-center justify-between border-b border-border/50 pb-3 flex-wrap gap-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
                                            <Landmark className="size-4" />
                                        </div>
                                        <div>
                                            <h2 className="text-base font-semibold text-foreground tracking-tight flex items-center gap-2">
                                                {group.client_name}
                                                <span className="text-xs font-normal text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                                                    {group.servers.length}{" "}
                                                    {group.servers.length === 1
                                                        ? "server"
                                                        : "servers"}
                                                </span>
                                            </h2>
                                        </div>
                                    </div>
                                    {group.client_uuid && (
                                        <Link
                                            to={`/clients/${group.client_uuid}`}
                                            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 hover:underline font-medium transition-colors"
                                        >
                                            <span>View Client</span>
                                            <ExternalLink className="size-3" />
                                        </Link>
                                    )}
                                </div>

                                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 pt-1">
                                    {group.servers.map((server) => (
                                        <ServerCard
                                            key={server.uuid}
                                            server={server}
                                        />
                                    ))}
                                </div>
                            </section>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 pt-4">
                        {servers.map((server) => (
                            <ServerCard key={server.uuid} server={server} />
                        ))}
                    </div>
                )}

                {/* Infinite Scroll Trigger Sentinel */}
                <div ref={loadMoreRef} className="w-full py-4 flex items-center justify-center min-h-[40px]">
                    {isFetchingNextPage && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="size-4 animate-spin text-primary" />
                            <span>Loading more servers…</span>
                        </div>
                    )}
                </div>
            </main>

            {/* Multi-Select Client Dialog for Viewing/Filtering */}
            <MultiSelectClientsDialog
                open={showMultiClientPicker}
                onOpenChange={setShowMultiClientPicker}
                title="View Servers by Clients"
                description="Select one or more clients to filter and view their servers."
                selectedClientUuids={selectedClientUuids}
                onApply={handleApplyClientFilter}
            />

            {/* Single Client Picker for Create Server Flow */}
            <SelectClientDialog
                open={showCreateClientPicker}
                onOpenChange={setShowCreateClientPicker}
                title="Select a Client"
                description="Choose which client this server belongs to."
                paramName="create_client_q"
                onSelectClient={(uuid) =>
                    navigate(`/servers/create?client_uuid=${uuid}`)
                }
            />
        </PageLayout>
    );
}


