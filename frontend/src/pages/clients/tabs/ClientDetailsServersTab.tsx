import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Server, Search, Filter, ChevronDown, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useServers } from "@/hooks/useServers";
import ClientServerCard from "../components/ClientServerCard";
import type { ClientData, ServerData } from "@/types/models";

type ServerFilter = "all" | "online" | "offline" | "archived";

interface ClientDetailsServersTabProps {
    client: ClientData;
    servers?: ServerData[];
    serversLoading?: boolean;
}

export function ClientDetailsServersTab({ client }: ClientDetailsServersTabProps) {
    const [serverSearch, setServerSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [serverFilter, setServerFilter] = useState<ServerFilter>("all");

    // Debounce search keystrokes for server-side query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(serverSearch.trim());
        }, 300);
        return () => clearTimeout(timer);
    }, [serverSearch]);

    // Server-side search & status filtering via useServers API
    const { data: serverResponse, isLoading: serversLoading } = useServers({
        client_uuid: client?.uuid,
        q: debouncedSearch || undefined,
        status: serverFilter === "all" ? undefined : serverFilter,
        per_page: 50,
    });

    const serverList = Array.isArray(serverResponse?.data)
        ? serverResponse.data
        : Array.isArray(serverResponse)
          ? serverResponse
          : [];

    return (
        <section>
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-base font-semibold text-foreground">Servers</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {client.servers_count > 0
                            ? `${client.servers_count} server${client.servers_count !== 1 ? "s" : ""} associated with this client.`
                            : "No servers are currently associated with this client."}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Search servers..."
                            value={serverSearch}
                            onChange={(e) => setServerSearch(e.target.value)}
                            className="w-48 pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground transition-colors"
                        />
                    </div>

                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" icon={<Filter size={14} />} className="gap-1 cursor-pointer">
                                {serverFilter === "all" ? "All" : serverFilter === "online" ? "Online" : serverFilter === "offline" ? "Offline" : "Archived"}
                                <ChevronDown size={14} />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-36 p-1">
                            {[
                                { label: "All", value: "all" },
                                { label: "Online", value: "online" },
                                { label: "Offline", value: "offline" },
                                { label: "Archived", value: "archived" },
                            ].map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setServerFilter(opt.value as ServerFilter)}
                                    className={cn(
                                        "flex items-center w-full px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
                                        serverFilter === opt.value ? "bg-accent text-accent-foreground" : "hover:bg-muted text-foreground",
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </PopoverContent>
                    </Popover>

                    <Link to={`/servers?client_uuid=${client?.uuid}`}>
                        <Button className="cursor-pointer" variant="outline" size="sm" label="View All" />
                    </Link>
                    <Link to={`/servers/create?client_uuid=${client?.uuid}`}>
                        <Button className="cursor-pointer" variant="outline" size="sm" icon={<Plus size={14} />} label="Add Server" />
                    </Link>
                </div>
            </div>

            {serversLoading ? (
                debouncedSearch ? (
                    <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground bg-card border border-border/60 rounded-xl">
                        <Loader2 className="size-6 animate-spin text-primary" />
                        <p className="text-sm">Searching servers…</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                        {Array.from({ length: Math.min(client.servers_count || 2, 4) }).map((_, i) => (
                            <div key={i} className="bg-card border border-border/60 rounded-xl p-5 flex flex-col gap-3 animate-pulse">
                                <div className="flex items-start justify-between">
                                    <div className="w-10 h-10 rounded-lg bg-muted" />
                                    <div className="w-10 h-3 bg-muted rounded" />
                                </div>
                                <div className="h-4 w-28 bg-muted rounded" />
                                <div className="h-3 w-20 bg-muted rounded" />
                                <div className="h-3 w-32 bg-muted rounded" />
                            </div>
                        ))}
                    </div>
                )
            ) : serverList.length > 0 ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                    {serverList.map((s: ServerData) => (
                        <ClientServerCard key={s.uuid} server={s} />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2 bg-card border border-border/60 rounded-xl">
                    <Server size={28} className="opacity-20" />
                    <p className="text-sm">
                        {debouncedSearch || serverFilter !== "all"
                            ? "No servers found matching your criteria."
                            : "No servers assigned to this client."}
                    </p>
                </div>
            )}
        </section>
    );
}
