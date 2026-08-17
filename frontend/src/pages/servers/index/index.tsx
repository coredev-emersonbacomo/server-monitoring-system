import { useState, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { Server, Wifi, WifiOff, AlertTriangle, Search, Trash2 } from "lucide-react";
import { useServers } from "@/hooks/useServers";
import { useClients } from "@/hooks/useClients";
import IndexToolbar from "@/components/IndexToolbar";
import type { SortOption } from "@/components/IndexToolbar";
import IndexHeader from "@/components/IndexHeader";
import { SelectClientDialog } from "./components/SelectClientDialog";
import { ServerGridCard } from "./components/ServerGridCard";

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
            let aVal: any = a[sortField as keyof typeof a];
            let bVal: any = b[sortField as keyof typeof b];

            if (sortField === "created_at") {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
            } else {
                aVal = (aVal ?? "").toString().toLowerCase();
                bVal = (bVal ?? "").toString().toLowerCase();
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
            archived: servers.filter((s) => s.record_status === "archived" || s.status === "archived").length,
        };
    }, [servers]);

    return (
        <PageLayout>
            <IndexHeader
                icon={Server}
                title={clientUuid && clientName ? `Servers — ${clientName}` : "Servers"}
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

                {!isLoading && (
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                        {filtered.length} server
                        {filtered.length !== 1 ? "s" : ""}
                    </p>
                )}

                {isLoading ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 pt-4">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-48 bg-card border border-border rounded-lg animate-pulse"
                            />
                        ))}
                    </div>
                ) : !filtered.length ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Search className="size-8 mb-2" />
                        <p className="text-sm">
                            {clientUuid
                                ? `No ${statusFilter ? statusFilter + " " : ""}servers found for this client.`
                                : `No ${statusFilter ? statusFilter + " " : ""}servers found.`}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 pt-4">
                        {filtered.map((server) => (
                            <ServerGridCard key={server.uuid} server={server} />
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