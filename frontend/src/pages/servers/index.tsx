import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { Server, Wifi, WifiOff, AlertTriangle, Search, Trash2 } from "lucide-react";
import { useServers } from "@/hooks/useServers";
import { cn } from "@/lib/utils";
import IndexToolbar from "@/components/IndexToolbar";
import type { SortOption } from "@/components/IndexToolbar";
import IndexHeader from "@/components/IndexHeader";

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
        color: "text-zinc-400",
        bg: "bg-zinc-500/10",
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
    archived: { icon: WifiOff, color: "text-slate-400", bg: "bg-slate-500/10" },
    pending_deletion: { icon: Trash2, color: "text-orange-400", bg: "bg-orange-500/10" },
};

export default function ServersIndex() {
    const [searchParams, setSearchParams] = useSearchParams();
    const statusFilter = searchParams.get("status");
    const clientUuid = searchParams.get("client_uuid") || undefined;

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
        const result = statusFilter
            ? statusFilter === "pending_deletion"
                ? servers.filter((s) => s.agent_deleted)
                : servers.filter((s) => s.status === statusFilter && !s.agent_deleted)
            : [...servers];
        return result.sort((a, b) => {
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
        if (!servers) return { online: 0, warning: 0, offline: 0, pending_installation: 0, waiting_for_installation: 0 };
        return {
            online: servers.filter((s) => s.status === "online").length,
            warning: servers.filter((s) => s.status === "warning").length,
            offline: servers.filter((s) => s.status === "offline").length,
            pending_installation: servers.filter((s) => s.status === "pending_installation").length,
            waiting_for_installation: servers.filter((s) => s.status === "waiting_for_installation").length,
            pending_deletion: servers.filter((s) => s.agent_deleted).length,
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

            <main className="w-full flex-1">
                <IndexToolbar
                    filterOptions={[
                        {
                            label: "All",
                            value: "",
                            count: servers?.length ?? 0,
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
                            count: counts.pending_deletion,
                            icon: <Trash2 className="size-3 text-orange-400" />,
                        },
                    ]}
                    filter={statusFilter ?? ""}
                    onFilterChange={(value) =>
                        setSearchParams(
                            value
                                ? {
                                      status: value,
                                      ...(clientUuid
                                          ? { client_id: String(clientUuid) }
                                          : {}),
                                  }
                                : clientUuid
                                  ? { client_id: String(clientUuid) }
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
                />
                {isLoading ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
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
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                        {filtered.map((server) => {
                            const effectiveStatus = server.agent_deleted ? "pending_deletion" : (server.status ?? "offline");
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
        </PageLayout>
    );
}
