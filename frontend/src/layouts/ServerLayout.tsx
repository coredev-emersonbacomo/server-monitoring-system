import { Outlet, useParams, useSearchParams, Link } from "react-router-dom";
import { useServers } from "@/hooks/useServers";
import { useUrlState } from "@/hooks/useUrlState";
import { DebouncedSearchInput } from "@/components/DebouncedSearchInput";
import { cn } from "@/lib/utils";
import {
    STATUS_CONFIG,
    resolveServerStatusKey,
} from "@/constants/serverStatus";

export default function ServerLayout() {
    const { uuid } = useParams<{ uuid: string }>();
    const [searchParams] = useSearchParams();
    const clientParam = searchParams.get("client");
    const clientUuid =
        clientParam && clientParam !== "all" ? clientParam : undefined;
    const [s] = useUrlState({ q: { default: "" } });
    const { data: response, isLoading } = useServers({
        client_uuid: clientUuid,
        q: s.q || undefined,
        per_page: 50,
    });
    const servers = response?.data ?? [];

    const currentClientUuid = servers.find((x) => x.uuid === uuid)?.client_uuid;
    const filtered = s.q
        ? servers
        : servers.filter((s) => s.client_uuid === currentClientUuid);

    return (
        <div className="flex-1 flex flex-row gap-6">
            <div className="flex-1 min-w-0">
                <Outlet key={uuid} />
            </div>

            <aside className="w-72 shrink-0 flex flex-col max-h-[calc(100vh-6rem)] sticky top-6 self-start border-l border-border/40 pl-6 overflow-hidden">
                <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 pb-3 -mx-1 px-1">
                    <h2 className="text-sm font-semibold text-muted-foreground mb-3 tracking-tight">
                        All Servers
                    </h2>

                    {/* Search */}
                    <DebouncedSearchInput
                        paramName="layout_server_q"
                        debounceMs={300}
                        placeholder="Search servers…"
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
                            const statusKey = resolveServerStatusKey(
                                server.status,
                                server.record_status,
                                server.agent_deleted,
                            );
                            const meta = STATUS_CONFIG[statusKey];
                            const Icon = meta.icon;
                            return (
                                <Link
                                    key={server.uuid}
                                    to={`/servers/${server.uuid}`}
                                    state={{ replace: true }}
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
                                            {server.name}
                                        </p>
                                        <p className="text-[11px] text-muted-foreground/70 truncate">
                                            {server.client_name}
                                        </p>
                                    </div>
                                </Link>
                            );
                        })
                    )}
                </div>
            </aside>
        </div>
    );
}
