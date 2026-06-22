import { Outlet, useParams, useNavigate } from "react-router-dom";
import { useServers } from "@/hooks/useServers";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, AlertTriangle } from "lucide-react";

const STATUS_META = {
    online: { icon: Wifi, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    warning: { icon: AlertTriangle, color: "text-amber-400", bg: "bg-amber-500/10" },
    offline: { icon: WifiOff, color: "text-red-400", bg: "bg-red-500/10" },
} as const;

export default function ServerLayout() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const activeId = id ? Number(id) : null;
    const { data: servers, isLoading } = useServers();

    return (
        <div className="flex-1 flex flex-row min-h-0 gap-6">
            <div className="flex-1 min-h-0 min-w-0">
                <Outlet />
            </div>

            <aside className="w-72 shrink-0 flex flex-col min-h-0 border-l border-border/40 pl-6">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 tracking-tight">
                    All Servers
                </h2>

                <div className="flex-1 overflow-y-auto space-y-1">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-12 bg-card border border-border rounded-lg animate-pulse" />
                        ))
                    ) : servers?.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No servers.</p>
                    ) : (
                        servers?.map((server) => {
                            const isActive = server.id === activeId;
                            const meta = STATUS_META[server.status];
                            const Icon = meta.icon;
                            return (
                                <button
                                    key={server.id}
                                    onClick={() => navigate(`/servers/${server.id}`)}
                                    className={cn(
                                        "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm",
                                        isActive
                                            ? "bg-accent text-accent-foreground border border-border/80"
                                            : "hover:bg-muted/50 text-muted-foreground border border-transparent",
                                    )}
                                >
                                    <Icon className={cn("size-3.5 shrink-0", meta.color)} />
                                    <div className="min-w-0 flex-1">
                                        <p className={cn(
                                            "truncate font-medium",
                                            isActive ? "text-foreground" : "text-muted-foreground",
                                        )}>
                                            {server.server_name}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground/70 truncate">
                                            {server.client_name}
                                        </p>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </aside>
        </div>
    );
}
