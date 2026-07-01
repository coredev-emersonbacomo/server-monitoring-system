import {
    Outlet,
    useParams,
    useNavigate,
    useSearchParams,
} from "react-router-dom";
import { useServers } from "@/hooks/useServers";
import { cn } from "@/lib/utils";
import { Wifi, WifiOff, AlertTriangle, Search } from "lucide-react";
import { useState } from "react";

const STATUS_META = {
    online: { icon: Wifi, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    warning: {
        icon: AlertTriangle,
        color: "text-amber-400",
        bg: "bg-amber-500/10",
    },
    offline: { icon: WifiOff, color: "text-red-400", bg: "bg-red-500/10" },
} as const;

export default function ServerLayout() {
    const { uuid } = useParams<{ uuid: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const clientParam = searchParams.get("client");
    const clientUuid = clientParam && clientParam !== "all" ? clientParam : undefined;
    const { data: servers, isLoading } = useServers(clientUuid);
    const [search, setSearch] = useState("");

    const filtered = servers?.filter((s) =>
        s.client_uuid === servers?.find((x) => x.uuid === uuid)?.client_uuid &&
        s.server_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 flex flex-row h-full gap-6 overflow-hidden">
            <div className="flex-1 min-w-0 overflow-auto">
                <Outlet key={uuid} />
            </div>

            <aside className="w-72 shrink-0 flex flex-col max-h-[80vh] border-l border-border/40 pl-6 overflow-hidden">
                <h2 className="text-sm font-semibold text-muted-foreground mb-3 tracking-tight shrink-0">
                    All Servers
                </h2>

                {/* Search */}
                <div className="relative mb-3 shrink-0">
                    <Search
                        size={13}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                    <input
                        type="text"
                        placeholder="Search servers…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-7 pr-3 py-1.5 text-xs border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
                    />
                </div>

                {/* Scrollable list */}
                <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                    {isLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-12 bg-card border border-border rounded-lg animate-pulse"
                            />
                        ))
                    ) : filtered?.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                            No servers found.
                        </p>
                    ) : (
                        filtered?.map((server) => {
                            const isActive = server.uuid === uuid;
                            const meta = STATUS_META[server.status];
                            const Icon = meta.icon;
                            return (
                                <button
                                    key={server.uuid}
                                    onClick={() => navigate(`/servers/${server.uuid}`, { replace: true })}
                                    className={cn(
                                        "w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm",
                                        isActive
                                            ? "bg-accent text-accent-foreground border border-border/80"
                                            : "hover:bg-muted/50 text-muted-foreground border border-transparent",
                                    )}
                                >
                                    <Icon
                                        className={cn(
                                            "size-3.5 shrink-0",
                                            meta.color,
                                        )}
                                    />
                                    <div className="min-w-0 flex-1">
                                        <p
                                            className={cn(
                                                "truncate font-medium",
                                                isActive
                                                    ? "text-foreground"
                                                    : "text-muted-foreground",
                                            )}
                                        >
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
