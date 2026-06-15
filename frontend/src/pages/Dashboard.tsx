import { useState, useMemo } from "react";
import { Search, Filter, Activity } from "lucide-react";
// import { useDashboardSocket } from "../hooks/useDashboardSocket";
import { CoopCard } from "../components/CoopCard";
import { ChartZoomProvider } from "../contexts/ChartZoomContext";
import { mockCoops } from "@/data/mockDashboard";

export default function Dashboard() {
    // const { coops, status } = useDashboardSocket();
    const coops = mockCoops;
    const [searchQuery, setSearchQuery] = useState("");

    const filteredCoops = useMemo(() => {
        if (!searchQuery.trim()) return coops;
        const q = searchQuery.toLowerCase();

        return coops
            .map((coop) => {
                // Check if coop name matches
                if (
                    coop.name.toLowerCase().includes(q) ||
                    coop.region.toLowerCase().includes(q)
                ) {
                    return coop;
                }
                // Otherwise, filter servers
                const matchingServers = coop.servers.filter(
                    (s) =>
                        s.name.toLowerCase().includes(q) ||
                        s.ip.toLowerCase().includes(q) ||
                        s.os.toLowerCase().includes(q),
                );
                return { ...coop, servers: matchingServers };
            })
            .filter((coop) => coop.servers.length > 0);
    }, [coops, searchQuery]);

    return (
        <ChartZoomProvider>
            <div className="min-h-screen bg-background text-foreground">
                {/* Header */}
                <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex h-16 items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Activity className="w-5 h-5 text-primary" />
                                </div>
                                <h1 className="text-lg font-semibold tracking-tight">
                                    System Status
                                </h1>
                                {status === "connected" && (
                                    <span
                                        className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse ml-2"
                                        title="Live"
                                    />
                                )}
                            </div>

                            <div className="flex-1 max-w-md flex items-center gap-2">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder="Search servers, IPs, or clusters..."
                                        value={searchQuery}
                                        onChange={(e) =>
                                            setSearchQuery(e.target.value)
                                        }
                                        className="w-full pl-9 pr-4 py-2 bg-muted/50 border-transparent focus:bg-background border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-lg text-sm transition-all outline-none"
                                    />
                                </div>
                                <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors border border-transparent hover:border-border/50">
                                    <Filter className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                    {filteredCoops.length === 0 ? (
                        <div className="text-center py-24 text-muted-foreground">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted/50 mb-4">
                                <Search className="w-6 h-6" />
                            </div>
                            <p className="text-lg">
                                No clusters or servers found.
                            </p>
                            <p className="text-sm mt-1">
                                Try adjusting your search query.
                            </p>
                        </div>
                    ) : (
                        filteredCoops.map((coop) => (
                            <CoopCard key={coop.id} coop={coop} />
                        ))
                    )}
                </main>
            </div>
        </ChartZoomProvider>
    );
}
