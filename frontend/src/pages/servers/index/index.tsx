import { useState, useMemo } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { Server, Wifi, WifiOff, AlertTriangle, Trash2 } from "lucide-react";
import { useServers } from "@/hooks/useServers";
import { useClients } from "@/hooks/useClients";
import IndexToolbar from "@/components/IndexToolbar";
import type { SortOption } from "@/components/IndexToolbar";
import IndexHeader from "@/components/IndexHeader";
import { SelectClientDialog } from "./components/SelectClientDialog";
import {
    STATUS_CONFIG,
    resolveServerStatusKey,
} from "@/constants/serverStatus";
import { ServerStatusBadge } from "@/components/ServerStatusBadge";
import { cn } from "@/lib/utils";

export default function ServersIndex() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState("");
    const statusFilter = searchParams.get("status");
    const clientUuid = searchParams.get("client_uuid") || undefined;

    // Client-picker dialogs (create-server flow + "view by client" flow)
    const [showClientPicker, setShowClientPicker] = useState(false);
    const [showClientFilterPicker, setShowClientFilterPicker] = useState(false);

    const { data: clients = [], isLoading: clientsLoading } = useClients();
    const { data: servers, isLoading } = useServers(clientUuid);

    const [sortField, setSortField] = useState<string>("created_at");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const sortOptions = [
        { label: "Created At", value: "created_at" },
        { label: "Server Name", value: "name" },
        { label: "Record Status", value: "record_status" },
    ];
    const currentSortLabel =
        sortOptions.find((o) => o.value === sortField)?.label ?? "";

    const clientName = useMemo(() => {
        if (!servers || servers.length === 0) return null;
        return servers[0].client_name;
    }, [servers]);

    const filtered = useMemo(() => {
        if (!servers) return [];
        const statusResult = statusFilter
            ? statusFilter === "archived"
                ? servers.filter((s) => s.record_status === "archived" || s.status === "archived")
                : statusFilter === "pending_deletion"
                ? servers.filter((s) => s.agent_deleted && s.record_status !== "archived" && s.status !== "archived")
                : servers.filter((s) => (s.status === statusFilter || (statusFilter === "pending_installation" && !s.status)) && !s.agent_deleted && s.record_status !== "archived" && s.status !== "archived")
            : servers.filter((s) => s.record_status !== "archived" && s.status !== "archived");

        const q = search.toLowerCase().trim();
        const result = q
            ? statusResult.filter(
                (s) =>
                    s.name.toLowerCase().includes(q) ||
                    s.client_name?.toLowerCase().includes(q),
            )
            : statusResult;

        return result.sort((a, b) => {
            const rawA: unknown = a[sortField as keyof typeof a];
            const rawB: unknown = b[sortField as keyof typeof b];

            let aVal: number | string;
            let bVal: number | string;

            if (sortField === "created_at") {
                aVal = rawA ? new Date(rawA as string).getTime() : 0;
                bVal = rawB ? new Date(rawB as string).getTime() : 0;
            } else {
                aVal = (rawA != null ? String(rawA) : "").toLowerCase();
                bVal = (rawB != null ? String(rawB) : "").toLowerCase();
            }

            if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
            if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
    }, [servers, statusFilter, search, sortField, sortDir]);

    const counts = useMemo(() => {
        if (!servers)
            return {
                all: 0,
                online: 0,
                warning: 0,
                offline: 0,
                pending_installation: 0,
                waiting_for_installation: 0,
                pending_deletion: 0,
                archived: 0,
            };

        const activeServers = servers.filter((s) => s.record_status !== "archived" && s.status !== "archived");
        return {
            all: activeServers.length,
            online: activeServers.filter((s) => s.status === "online" && !s.agent_deleted).length,
            warning: activeServers.filter((s) => s.status === "warning" && !s.agent_deleted).length,
            offline: activeServers.filter((s) => s.status === "offline" && !s.agent_deleted).length,
            pending_installation: activeServers.filter((s) => (s.status === "pending_installation" || !s.status) && !s.agent_deleted).length,
            waiting_for_installation: activeServers.filter((s) => s.status === "waiting_for_installation" && !s.agent_deleted).length,
            pending_deletion: activeServers.filter((s) => s.agent_deleted).length,
            agent_uninstalled: activeServers.filter((s) => s.status === "agent_uninstalled").length,
            archived: servers.filter((s) => s.record_status === "archived" || s.status === "archived").length,
        };
    }, [servers]);

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
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search servers…"
                    filterOptions={[
                        {
                            label: "All",
                            value: "",
                            count: counts.all,
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
                            icon: <AlertTriangle className="size-3 text-slate-400" />,
                        },
                        {
                            label: "Waiting For Installation",
                            value: "waiting_for_installation",
                            count: counts.waiting_for_installation,
                            icon: <AlertTriangle className="size-3 text-amber-400 animate-pulse" />,
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
                            ? statusFilter === "pending_installation"
                                ? "Pending Installation"
                                : statusFilter === "waiting_for_installation"
                                    ? "Waiting For Installation"
                                    : statusFilter.charAt(0).toUpperCase() +
                                    statusFilter.slice(1)
                            : "All"
                    }
                    sortOptions={sortOptions as SortOption[]}
                    sortField={sortField}
                    onSortFieldChange={setSortField}
                    sortDir={sortDir}
                    onSortDirChange={() =>
                        setSortDir((d) => (d === "desc" ? "asc" : "desc"))
                    }
                    sortLabel={currentSortLabel}
                    onCreate={() =>
                        clientUuid
                            ? navigate(`/servers/create?client_uuid=${clientUuid}`)
                            : setShowClientPicker(true)
                    }
                    createLabel="Add server"
                    onViewByClient={() => setShowClientFilterPicker(true)}
                    viewByClientLabel={
                        clientUuid && clientName
                            ? clientName
                            : "View by Client"
                    }
                    onClearViewByClient={
                        clientUuid
                            ? () => setSearchParams({})
                            : undefined
                    }
                />


                {isLoading ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 pt-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-48 bg-card border border-border rounded-lg animate-pulse"
                            />
                        ))}
                </div>
            ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 pt-4">
                    {filtered.map((server) => {
                        const effectiveStatus =
                            resolveServerStatusKey(
                                server.status,
                                server.record_status,
                                server.agent_deleted,
                            );
                        const meta = STATUS_CONFIG[effectiveStatus];
                        const Icon = meta.icon;
                        return (
                            <Link
                                key={server.uuid}
                                to={`/servers/${server.uuid}?client=all`}
                                className="block rounded-lg transition-transform duration-200 hover:-translate-y-1"
                            >
                                <div className="relative size-full bg-card rounded-lg border border-border p-6 shadow-sm flex flex-col items-center font-sans gap-3 transition-shadow hover:shadow-md">
                                    <div className={cn("p-3 rounded-lg", meta.bg)}>
                                        <Icon className={cn("size-5", meta.color)} />
                                    </div>
                                    <div className="text-center w-full flex flex-col items-center gap-1.5">
                                        <p className="text-sm font-medium text-foreground truncate w-full">
                                            {server.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate w-full">
                                            {server.client_name}
                                        </p>
                                        <ServerStatusBadge
                                            status={server.status}
                                            record_status={server.record_status}
                                            agent_deleted={server.agent_deleted}
                                            size="sm"
                                        />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </main>

        {/* Client Pickers */}
            <SelectClientDialog
                open={showClientPicker}
                onOpenChange={setShowClientPicker}
                title="Select a Client"
                description="Choose which client this server belongs to."
                clients={clients}
                isLoading={clientsLoading}
                onSelectClient={(uuid) => navigate(`/servers/create?client_uuid=${uuid}`)}
            />

            <SelectClientDialog
                open={showClientFilterPicker}
                onOpenChange={setShowClientFilterPicker}
                title="View Servers by Client"
                description="Select a client to view all of their servers."
                clients={clients}
                isLoading={clientsLoading}
                onSelectClient={(uuid) => navigate(`/servers?client_uuid=${uuid}`)}
            />
        </PageLayout>
    );
}