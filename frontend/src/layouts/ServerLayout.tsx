import { Outlet, useParams, useSearchParams, Link } from "react-router-dom";
import { useServers } from "@/hooks/useServers";
import { useServer } from "@/pages/servers/hooks/useServer";
import { cn } from "@/lib/utils";
import { Loader2, Search, Server, X } from "lucide-react";
import { useState } from "react";
import {
    STATUS_CONFIG,
    resolveServerStatusKey,
} from "@/constants/serverStatus";

export default function ServerLayout() {
    const { uuid } = useParams<{ uuid: string }>();
    const [searchParams] = useSearchParams();
    const [search, setSearch] = useState("");
    const [isMobileOpen, setIsMobileOpen] = useState(false);

    // Check if user came from "Servers" tab (which passes ?client=all)
    const clientParam = searchParams.get("client");
    const isAllMode = clientParam === "all";

    // 1. Fetch current server details to get reliable client_uuid & client_name
    const { data: currentServerData } = useServer(uuid ?? "");

    const clientUuid = isAllMode
        ? undefined
        : (clientParam && clientParam !== "all"
            ? clientParam
            : currentServerData?.client_uuid);

    const isClientResolving = !isAllMode && !clientUuid;

    // 2. Fetch servers:
    // If in "all" mode: fetch all servers (or search all servers).
    // If in "client" mode: ALWAYS keep client_uuid scoped to this client, even during search!
    const trimmedSearch = search.trim();
    const shouldFetch = isAllMode || Boolean(clientUuid);

    const { data: serversData, isLoading: isServersLoading } = useServers(
        shouldFetch
            ? {
                  // In client mode, restrict to clientUuid. In all mode, leave client_uuid undefined.
                  client_uuid: isAllMode ? undefined : clientUuid,
                  q: trimmedSearch || undefined,
                  per_page: 100,
              }
            : undefined,
    );

    const isLoading = isServersLoading || (isClientResolving && !trimmedSearch);

    const serverList = Array.isArray(serversData?.data)
        ? serversData.data
        : Array.isArray(serversData)
          ? serversData
          : [];

    const currentClientName =
        currentServerData?.client_name ??
        serverList.find((s) => s.uuid === uuid)?.client_name ??
        "Client";

    const filtered = isClientResolving && !trimmedSearch ? [] : serverList;

    const renderServerListContent = () => (
        <>
            <div className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 pb-3 -mx-1 px-1">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-sm font-semibold text-muted-foreground tracking-tight flex items-center gap-2">
                        <Server className="size-4 text-primary" />
                        <span>
                            {trimmedSearch
                                ? isAllMode
                                    ? "Search Results"
                                    : `Search (${currentClientName})`
                                : isAllMode
                                  ? "All Servers"
                                  : `Servers (${currentClientName})`}
                        </span>
                    </h2>
                    {/* Mobile close button */}
                    <button
                        type="button"
                        onClick={() => setIsMobileOpen(false)}
                        className="md:hidden p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                {/* Search */}
                <div className="relative shrink-0">
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
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
                {isLoading ? (
                    trimmedSearch ? (
                        /* Spinner specifically on search loading */
                        <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
                            <Loader2 className="size-5 animate-spin text-primary" />
                            <span className="text-xs">Searching servers…</span>
                        </div>
                    ) : (
                        /* Skeletons on initial page load */
                        Array.from({ length: 5 }).map((_, i) => (
                            <div
                                key={i}
                                className="h-12 bg-card border border-border rounded-lg animate-pulse"
                            />
                        ))
                    )
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
                        const linkSearch = searchParams.toString();
                        return (
                            <Link
                                key={server.uuid}
                                to={`/servers/${server.uuid}${linkSearch ? `?${linkSearch}` : ""}`}
                                state={{ replace: true }}
                                onClick={() => setIsMobileOpen(false)}
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
        </>
    );

    return (
        <div className="flex-1 flex flex-row gap-6">
            <div className="flex-1 min-w-0">
                <Outlet />
            </div>

            {/* Mobile Floating Server List Button (placed at top right next to burger) */}
            <div className="md:hidden fixed top-3 right-16 z-40">
                <button
                    type="button"
                    onClick={() => setIsMobileOpen(true)}
                    className="p-2 rounded-xl bg-card/90 backdrop-blur-md border border-border/80 text-foreground shadow-md hover:bg-muted transition-colors cursor-pointer flex items-center justify-center"
                    aria-label="Open Server List"
                    title="View Servers"
                >
                    <Server className="size-5 text-primary" />
                </button>
            </div>

            {/* Mobile Backdrop */}
            <div
                className={cn(
                    "md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-60 transition-opacity duration-300",
                    isMobileOpen
                        ? "opacity-100 pointer-events-auto"
                        : "opacity-0 pointer-events-none",
                )}
                onClick={() => setIsMobileOpen(false)}
            />

            {/* Mobile Drawer (Right-side slide over) */}
            <aside
                className={cn(
                    "md:hidden fixed inset-y-0 right-0 z-70 w-80 max-w-[85vw] bg-background text-foreground p-5 border-l border-border/90 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out",
                    isMobileOpen
                        ? "translate-x-0"
                        : "translate-x-full pointer-events-none",
                )}
            >
                {renderServerListContent()}
            </aside>

            {/* Desktop Aside (unchanged fixed sidebar on right) */}
            <aside className="hidden md:flex w-72 shrink-0 flex-col max-h-[calc(100vh-6rem)] sticky top-6 self-start border-l border-border/40 pl-6 overflow-hidden">
                {renderServerListContent()}
            </aside>
        </div>
    );
}
