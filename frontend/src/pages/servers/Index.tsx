import { useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
    Server,
    Search,
    Wifi,
    WifiOff,
    AlertTriangle,
    Building2,
} from "lucide-react";
import { useServers } from "@/hooks/useServers";
import { cn } from "@/lib/utils";

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
};

export default function ServersIndex() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const statusFilter = searchParams.get("status");
    const clientUuid = searchParams.get("client_uuid") || undefined;

    const { data: servers, isLoading } = useServers(clientUuid);

    const clientName = useMemo(() => {
        if (!servers || servers.length === 0) return null;
        return servers[0].client_name;
    }, [servers]);

    const filtered = useMemo(() => {
        if (!servers) return [];
        if (!statusFilter) return servers;
        return servers.filter((s) => s.status === statusFilter);
    }, [servers, statusFilter]);

    const counts = useMemo(() => {
        if (!servers) return { online: 0, warning: 0, offline: 0 };
        return {
            online: servers.filter((s) => s.status === "online").length,
            warning: servers.filter((s) => s.status === "warning").length,
            offline: servers.filter((s) => s.status === "offline").length,
        };
    }, [servers]);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
            <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div>
                    <div className="flex h-16 items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Server className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold tracking-tight">
                                    {clientUuid && clientName
                                        ? `${clientName} Servers`
                                        : "Servers"}
                                </h1>
                                {clientUuid && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Showing servers for this client only
                                    </p>
                                )}
                            </div>
                        </div>
                        {clientUuid && (
                            <button
                                onClick={() =>
                                    navigate(`/clients/${clientUuid}`)
                                }
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                                <Building2 className="w-3.5 h-3.5" />
                                Back to Client
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="py-6 w-full flex-1 min-h-0 overflow-auto">
                <div className="flex items-center gap-2 mb-6 flex-wrap">
                    <button
                        onClick={() =>
                            setSearchParams(
                                clientUuid
                                    ? { client_id: String(clientUuid) }
                                    : {},
                            )
                        }
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                            !statusFilter
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:text-foreground",
                        )}
                    >
                        All ({servers?.length ?? 0})
                    </button>
                    <button
                        onClick={() =>
                            setSearchParams({
                                status: "online",
                                ...(clientUuid
                                    ? { client_id: String(clientUuid) }
                                    : {}),
                            })
                        }
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5",
                            statusFilter === "online"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-muted text-muted-foreground hover:text-foreground",
                        )}
                    >
                        <Wifi className="size-3" />
                        Online ({counts.online})
                    </button>
                    <button
                        onClick={() =>
                            setSearchParams({
                                status: "warning",
                                ...(clientUuid
                                    ? { client_id: String(clientUuid) }
                                    : {}),
                            })
                        }
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5",
                            statusFilter === "warning"
                                ? "bg-amber-500/20 text-amber-400"
                                : "bg-muted text-muted-foreground hover:text-foreground",
                        )}
                    >
                        <AlertTriangle className="size-3" />
                        Warning ({counts.warning})
                    </button>
                    <button
                        onClick={() =>
                            setSearchParams({
                                status: "offline",
                                ...(clientUuid
                                    ? { client_id: String(clientUuid) }
                                    : {}),
                            })
                        }
                        className={cn(
                            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5",
                            statusFilter === "offline"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-muted text-muted-foreground hover:text-foreground",
                        )}
                    >
                        <WifiOff className="size-3" />
                        Offline ({counts.offline})
                    </button>
                </div>

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
                            const meta = STATUS_META[server.status];
                            const Icon = meta.icon;
                            return (
                                <div
                                    key={server.uuid}
                                    onClick={() =>
                                        navigate(
                                            `/servers/${server.uuid}?client=all`,
                                        )
                                    }
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
                                            {server.server_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {server.client_name}
                                            {server.external_ip &&
                                                ` · ${server.external_ip}`}
                                        </p>
                                    </div>
                                    <span
                                        className={cn(
                                            "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded",
                                            server.status === "online" &&
                                                "text-emerald-400 bg-emerald-500/10",
                                            server.status === "warning" &&
                                                "text-amber-400 bg-amber-500/10",
                                            server.status === "offline" &&
                                                "text-red-400 bg-red-500/10",
                                        )}
                                    >
                                        {server.status}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
