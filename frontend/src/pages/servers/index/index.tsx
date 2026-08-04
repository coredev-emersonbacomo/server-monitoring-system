import { useState, useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { Server, Wifi, WifiOff, AlertTriangle, Search, Trash2, Landmark } from "lucide-react";
import { useServers } from "@/hooks/useServers";
import { useClients } from "@/hooks/useClients";
import { cn } from "@/lib/utils";
import IndexToolbar from "@/components/IndexToolbar";
import type { SortOption } from "@/components/IndexToolbar";
import IndexHeader from "@/components/IndexHeader";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const STATUS_META: Record<
    string,
    { icon: typeof Server; color: string; bg: string }
> = {
    online: { icon: Wifi, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    warning: {
        icon: AlertTriangle,
        color: "text-amber-400",
        bg: "bg-amber-500/10",
    },
    offline: { icon: WifiOff, color: "text-red-400", bg: "bg-red-500/10" },
    pending_installation: {
        icon: AlertTriangle,
        color: "text-amber-400",
        bg: "bg-amber-500/10",
    },
    waiting_for_installation: {
        icon: AlertTriangle,
        color: "text-amber-400",
        bg: "bg-amber-500/10",
    },
    waiting_for_first_heartbeat: {
        icon: WifiOff,
        color: "text-blue-400",
        bg: "bg-blue-500/10",
    },
    archived: { icon: Trash2, color: "text-slate-400", bg: "bg-slate-500/10" },
    pending_deletion: { icon: Trash2, color: "text-orange-400", bg: "bg-orange-500/10" },
};

export default function ServersIndex() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [search, setSearch] = useState("");
    const statusFilter = searchParams.get("status");
    const clientUuid = searchParams.get("client_uuid") || undefined;

    // Client-picker dialogs (create-server flow + "view by client" flow)
    const [showClientPicker, setShowClientPicker] = useState(false);
    const [showClientFilterPicker, setShowClientFilterPicker] = useState(false);
    const [clientPickerSearch, setClientPickerSearch] = useState("");

    const { data: clients, isLoading: clientsLoading } = useClients();

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
        let result = servers;
        if (statusFilter) {
            if (statusFilter === "pending_deletion") {
                result = servers.filter((s) => s.agent_deleted && s.record_status !== "archived" && s.status !== "archived");
            } else if (statusFilter === "archived") {
                result = servers.filter((s) => s.record_status === "archived" || s.status === "archived");
            } else {
                result = servers.filter((s) => s.status === statusFilter && !s.agent_deleted && s.record_status !== "archived" && s.status !== "archived");
            }
        } else {
            result = servers.filter((s) => s.record_status !== "archived" && s.status !== "archived");
        }
        return [...result].sort((a, b) => {
        const cmp = (() => {
            switch (sortField) {
                case "name":
                    return a.name.localeCompare(b.name);
                case "record_status":
                    return a.record_status.localeCompare(b.record_status);
                default:
                    return a.created_at.localeCompare(b.created_at);
            }
        })();
        return sortDir === "desc" ? -cmp : cmp;
    });
}, [servers, statusFilter, sortField, sortDir]);

const counts = useMemo(() => {
    if (!servers) return { all: 0, online: 0, warning: 0, offline: 0, pending_installation: 0, waiting_for_installation: 0, archived: 0 };
    return {
        all: servers.filter((s) => s.record_status !== "archived" && s.status !== "archived").length,
        online: servers.filter((s) => s.status === "online" && s.record_status !== "archived").length,
        warning: servers.filter((s) => s.status === "warning" && s.record_status !== "archived").length,
        offline: servers.filter((s) => s.status === "offline" && s.record_status !== "archived").length,
        pending_installation: servers.filter((s) => s.status === "pending_installation" && s.record_status !== "archived").length,
        waiting_for_installation: servers.filter((s) => s.status === "waiting_for_installation" && s.record_status !== "archived").length,
        pending_deletion: servers.filter((s) => s.agent_deleted && s.record_status !== "archived" && s.status !== "archived").length,
        archived: servers.filter((s) => s.record_status === "archived" || s.status === "archived").length,
    };
}, [servers]);

// Shared search box for both client-picker dialogs. Only one dialog is ever
// open at a time, but leftover text carries over if you open the other one
// next — split into two state vars if that's not the behavior you want.
const filteredClients = useMemo(() => {
    if (!clients) return [];
    if (!clientPickerSearch.trim()) return clients;
    const q = clientPickerSearch.toLowerCase();
    return clients.filter((c) => c.name.toLowerCase().includes(q));
}, [clients, clientPickerSearch]);

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
                        icon: <AlertTriangle className="size-3 text-zinc-400" />,
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

            {/* ── Count label ── */}
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
                    {filtered.map((server) => {
                        const isArchived = server.record_status === "archived" || server.status === "archived";
                        const effectiveStatus = isArchived
                            ? "archived"
                            : server.agent_deleted
                            ? "pending_deletion"
                            : (server.status ?? "offline");
                        const meta = STATUS_META[effectiveStatus] ?? STATUS_META.offline;
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
                                        <span
                                            className={cn(
                                                "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded text-center",
                                                meta.color,
                                                meta.bg,
                                            )}
                                        >
                                            {effectiveStatus.replace(/_/g, " ")}
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </main>
        <Dialog open={showClientPicker} onOpenChange={setShowClientPicker}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Select a Client</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <p className="text-xs text-muted-foreground">
                        Choose which client this server belongs to.
                    </p>
                    <div className="relative">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="text"
                            value={clientPickerSearch}
                            onChange={(e) => setClientPickerSearch(e.target.value)}
                            placeholder="Search clients…"
                            className="w-full h-10 rounded-lg border border-border bg-background pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            autoFocus
                        />
                    </div>

                    {clientsLoading ? (
                        <div className="space-y-2">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="h-10 bg-muted rounded animate-pulse"
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {filteredClients.map((c) => (
                                <button
                                    key={c.uuid}
                                    onClick={() => {
                                        setShowClientPicker(false);
                                        navigate(`/servers/create?client_uuid=${c.uuid}`);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left border border-border/40 hover:border-border cursor-pointer"
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <Landmark size={14} className="text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {c.name}
                                        </p>
                                        {c.location && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {c.location}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))}
                            {filteredClients.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No matching clients found.
                                </p>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <DialogClose asChild>
                        <Button variant="outline" label="Cancel" />
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>

        <Dialog open={showClientFilterPicker} onOpenChange={setShowClientFilterPicker}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>View Servers by Client</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <p className="text-xs text-muted-foreground">
                        Select a client to view all of their servers.
                    </p>
                    <div className="relative">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            type="text"
                            value={clientPickerSearch}
                            onChange={(e) => setClientPickerSearch(e.target.value)}
                            placeholder="Search clients…"
                            className="w-full h-10 rounded-lg border border-border bg-background pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            autoFocus
                        />
                    </div>

                    {clientsLoading ? (
                        <div className="space-y-2">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="h-10 bg-muted rounded animate-pulse"
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {filteredClients.map((c) => (
                                <button
                                    key={c.uuid}
                                    onClick={() => {
                                        setShowClientFilterPicker(false);
                                        navigate(`/servers?client_uuid=${c.uuid}`);
                                    }}
                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left border border-border/40 hover:border-border cursor-pointer"
                                >
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                        <Landmark size={14} className="text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {c.name}
                                        </p>
                                        {c.location && (
                                            <p className="text-xs text-muted-foreground truncate">
                                                {c.location}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))}
                            {filteredClients.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    No matching clients found.
                                </p>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex justify-end gap-3 pt-2">
                    <DialogClose asChild>
                        <Button variant="outline" label="Cancel" />
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    </PageLayout>
);
}