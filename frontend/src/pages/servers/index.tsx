import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import PageLayout from "@/components/PageLayout";
import {
    Server,
    Wifi,
    WifiOff,
    AlertTriangle,
    Trash2,
    UserCheck,
} from "lucide-react";
import { useServers } from "@/hooks/useServers";
import { useUrlState } from "@/hooks/useUrlState";
import IndexToolbar from "@/components/IndexToolbar";
import type { SortOption } from "@/components/IndexToolbar";
import IndexHeader from "@/components/IndexHeader";
import { SelectClientDialog } from "./components/SelectClientDialog";
import { ServerCard, SkeletonGrid } from "./components/ServerCard";

export default function ServersIndex() {
    useDocumentTitle("Servers");
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const statusFilter = searchParams.get("status");
    const clientUuid = searchParams.get("client_uuid") || undefined;

    // Client-picker dialogs (create-server flow + "view by client" flow)
    const [showClientPicker, setShowClientPicker] = useState(false);
    const [showClientFilterPicker, setShowClientFilterPicker] = useState(false);

    const [s, setS] = useUrlState({
        q: { default: "" },
        sort: { default: "created_at" },
        dir: { default: "desc" as "asc" | "desc" },
    });

    const { data: response, isLoading } = useServers({
        client_uuid: clientUuid,
        q: s.q || undefined,
        status: statusFilter || undefined,
        sort: s.sort,
        dir: s.dir,
        per_page: 50,
    });
    const servers = useMemo(() => response?.data ?? [], [response]);

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

    const counts = useMemo(() => {
        if (!response)
            return {
                all: 0,
                assigned: 0,
                online: 0,
                warning: 0,
                offline: 0,
                pending_installation: 0,
                waiting_for_installation: 0,
                archived: 0,
            };

        const activeServers = servers.filter(
            (s) => s.record_status !== "archived" && s.status !== "archived",
        );
        return {
            all: activeServers.length,
            assigned: activeServers.filter((s) =>
                Boolean(s.is_assigned_to_current_user),
            ).length,
            online: activeServers.filter(
                (s) => s.status === "online" && !s.agent_deleted,
            ).length,
            warning: activeServers.filter(
                (s) => s.status === "warning" && !s.agent_deleted,
            ).length,
            offline: activeServers.filter(
                (s) => s.status === "offline" && !s.agent_deleted,
            ).length,
            pending_installation: activeServers.filter(
                (s) =>
                    (s.status === "pending_installation" || !s.status) &&
                    !s.agent_deleted,
            ).length,
            waiting_for_installation: activeServers.filter(
                (s) =>
                    s.status === "waiting_for_installation" && !s.agent_deleted,
            ).length,
            pending_deletion: activeServers.filter((s) => s.agent_deleted)
                .length,
            agent_uninstalled: activeServers.filter(
                (s) => s.status === "agent_uninstalled",
            ).length,
            archived: servers.filter(
                (s) =>
                    s.record_status === "archived" || s.status === "archived",
            ).length,
        };
    }, [response, servers]);

    return (
        <PageLayout>
            <IndexHeader
                icon={Server}
                title={
                    clientUuid && clientName
                        ? `${clientName} Servers`
                        : "Servers"
                }
                description={`Manage ${clientUuid ? clientName + "'s" : "all"} servers.`}
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
                    onFilterChange={(value) =>
                        setSearchParams(
                            value
                                ? {
                                      status: value,
                                      ...(clientUuid
                                          ? { client_uuid: String(clientUuid) }
                                          : {}),
                                  }
                                : clientUuid
                                  ? { client_uuid: String(clientUuid) }
                                  : {},
                        )
                    }
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
                        clientUuid
                            ? navigate(
                                  `/servers/create?client_uuid=${clientUuid}`,
                              )
                            : setShowClientPicker(true)
                    }
                    createLabel="Add server"
                    onViewByClient={() => setShowClientFilterPicker(true)}
                    viewByClientLabel={
                        clientUuid && clientName ? clientName : "View by Client"
                    }
                    onClearViewByClient={
                        clientUuid ? () => setSearchParams({}) : undefined
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
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 pt-4">
                        {servers.map((server) => (
                            <ServerCard key={server.uuid} server={server} />
                        ))}
                    </div>
                )}
            </main>

            {/* Client Pickers */}
            <SelectClientDialog
                open={showClientPicker}
                onOpenChange={setShowClientPicker}
                title="Select a Client"
                description="Choose which client this server belongs to."
                paramName="create_client_q"
                onSelectClient={(uuid) =>
                    navigate(`/servers/create?client_uuid=${uuid}`)
                }
            />

            <SelectClientDialog
                open={showClientFilterPicker}
                onOpenChange={setShowClientFilterPicker}
                title="View Servers by Client"
                description="Select a client to view all of their servers."
                paramName="filter_client_q"
                onSelectClient={(uuid) =>
                    navigate(`/servers?client_uuid=${uuid}`)
                }
            />
        </PageLayout>
    );
}
