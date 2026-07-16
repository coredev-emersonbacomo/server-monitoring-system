import { useState, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import { Server, Wifi, WifiOff, AlertTriangle, Search } from "lucide-react";
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
            ? servers.filter((s) => s.status === statusFilter)
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
                    <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-16 bg-card border border-border rounded-lg animate-pulse"
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
                    <div className="space-y-2">
                        {filtered.map((server) => {
                            const meta = STATUS_META[server.status ?? "offline"] ?? STATUS_META.offline;
                            const Icon = meta.icon;
                            return (
                                <Link
                                    key={server.uuid}
                                    to={`/servers/${server.uuid}?client=all`}
                                    className="flex items-center gap-4 p-4 rounded-lg border border-border/60 bg-card hover:bg-muted/20 transition-colors cursor-pointer"
                                >
                                    <div
                                        className={cn(
                                            "p-2 rounded-lg",
                                            meta.bg,
                                        )}
                                    >
                                        <Icon
                                            className={cn("size-4", meta.color)}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground truncate">
                                            {server.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {server.client_name}
                                        </p>
                                    </div>
                                    <span
                                        className={cn(
                                            "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded text-center min-w-15",
                                            server.status === "online" &&
                                                "text-emerald-400 bg-emerald-500/10",
                                            server.status === "warning" &&
                                                "text-amber-400 bg-amber-500/10",
                                            server.status === "offline" &&
                                                "text-red-400 bg-red-500/10",
                                            server.status ===
                                                "pending_installation" &&
                                                "text-zinc-400 bg-zinc-500/10",
                                            server.status ===
                                                "waiting_for_installation" &&
                                                "text-amber-400 bg-amber-500/10",
                                            server.status ===
                                                "waiting_for_first_heartbeat" &&
                                                "text-blue-400 bg-blue-500/10",
                                            server.status === "archived" &&
                                                "text-slate-400 bg-slate-500/10",
                                        )}
                                    >
                                        {(server.status || "pending").replace(
                                            /_/g,
                                            " ",
                                        )}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </main>
        </PageLayout>
    );
}
