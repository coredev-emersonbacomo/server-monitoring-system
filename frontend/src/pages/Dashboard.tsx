import { useState, useMemo, useRef, useEffect } from "react";
import { Search, Filter, Activity } from "lucide-react";
import { useMockDashboard } from "../hooks/useMockDashboard";
import { DashboardCoopCard } from "../components/dashboard/DashboardCoopCard";
import { ChartZoomProvider } from "../contexts/ChartZoomContext";
import { useVirtualizer } from "@tanstack/react-virtual";

export default function Dashboard() {
    const { coops, status } = useMockDashboard();
    const [searchQuery, setSearchQuery] = useState("");
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    const scrollRef = useRef<HTMLDivElement>(null);

    const filteredCoops = useMemo(() => {
        if (!searchQuery.trim()) return coops;
        const q = searchQuery.toLowerCase();

        return coops
            .map((coop) => {
                if (
                    coop.name.toLowerCase().includes(q) ||
                    coop.region.toLowerCase().includes(q)
                ) {
                    return coop;
                }
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

    const virtualizer = useVirtualizer({
        count: filteredCoops.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => 500,
        measureElement: (el) => el.getBoundingClientRect().height,
        overscan: 2,
    });

    return (
        <ChartZoomProvider>
            <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
                {/* Header */}
                <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
                    <div className="px-4 sm:px-6 lg:px-8">
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
                                <time className="tabular-nums text-sm text-muted-foreground min-w-20">
                                    {time.toLocaleTimeString()}
                                </time>
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
                {filteredCoops.length === 0 ? (
                    <main className="px-4 sm:px-6 lg:px-8 py-8 w-full">
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
                    </main>
                ) : (
                    <main className="px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 min-h-0">
                        <div ref={scrollRef} className="h-full overflow-auto">
                            <div
                                style={{
                                    height: `${virtualizer.getTotalSize()}px`,
                                    width: "100%",
                                    position: "relative",
                                }}
                            >
                                {virtualizer
                                    .getVirtualItems()
                                    .map((virtualItem) => (
                                        <div
                                            key={virtualItem.key}
                                            data-index={virtualItem.index}
                                            ref={virtualizer.measureElement}
                                            style={{
                                                position: "absolute",
                                                top: 0,
                                                left: 0,
                                                width: "100%",
                                                transform: `translateY(${virtualItem.start}px)`,
                                            }}
                                        >
                                            <DashboardCoopCard
                                                coop={
                                                    filteredCoops[
                                                        virtualItem.index
                                                    ]
                                                }
                                            />
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </main>
                )}
            </div>
        </ChartZoomProvider>
    );
}
