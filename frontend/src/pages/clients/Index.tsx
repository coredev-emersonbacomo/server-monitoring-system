import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
    Plus,
    Search,
    Landmark,
    RefreshCw,
    Filter,
    ChevronDown,
    Loader2,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useClients, useDeleteClient } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { components } from "@/api/schema";

type ClientData = components["schemas"]["ClientData"];
type FilterTab = "all" | "with-servers" | "no-servers";

// How many cards to reveal per "page". Tune freely.
const PAGE_SIZE = 8;

// Approximate card height + gap in px — used by the virtualizer for estimation.
// The virtualizer will measure real heights after mount, so this just avoids
// a large layout jump on first render.
const CARD_ESTIMATE_PX = 300;

// ─── Skeleton grid ────────────────────────────────────────────────────────────

function SkeletonGrid() {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="bg-card border border-border rounded-lg p-6 flex flex-col items-center gap-3 animate-pulse"
                >
                    <div className="w-20 h-20 rounded-full bg-muted" />
                    <div className="h-4 w-28 bg-muted rounded" />
                    <div className="h-3 w-36 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                </div>
            ))}
        </div>
    );
}

// ─── Client card ─────────────────────────────────────────────────────────────

function ClientCard({
    client,
    onDelete,
}: {
    client: ClientData;
    onDelete: (c: ClientData) => void;
}) {
    return (
        <Link
            to={`/clients/${client.id}`}
            className="block rounded-lg transition-transform duration-200 hover:-translate-y-1"
        >
            <div className="relative w-full bg-card rounded-lg border border-border p-6 shadow-sm flex flex-col items-center font-sans gap-3 transition-shadow hover:shadow-md h-72 justify-center">
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span
                            className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                client.servers_count > 0
                                    ? "bg-emerald-500"
                                    : "bg-muted-foreground/40",
                            )}
                        />
                        {client.servers_count > 0
                            ? `${client.servers_count} server${client.servers_count !== 1 ? "s" : ""}`
                            : "No servers"}
                    </span>
                    <button
                        onClick={(e) => {
                            // Prevent the Link from navigating when clicking Remove
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(client);
                        }}
                        className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded text-[11px]"
                    >
                        Remove
                    </button>
                </div>

                <div className="mt-4 mb-1">
                    <img
                        src={client.banner_image_url}
                        alt={client.name}
                        className="w-20 h-20 rounded-full object-cover border border-border shadow-sm"
                    />
                </div>

                <div className="text-center w-full flex flex-col items-center gap-1.5">
                    {client.name}

                    <p className="text-muted-foreground text-sm">
                        {client.email}
                    </p>

                    {client.location && (
                        <p className="text-muted-foreground text-xs">
                            {client.location}
                        </p>
                    )}

                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm mt-1">
                        <Landmark size={16} className="text-muted-foreground" />
                        <span>
                            {client.contact_number
                                .replace(/\D/g, "")
                                .replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3")}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// ─── Virtualised infinite-scroll grid ────────────────────────────────────────
//
// TanStack Virtual operates on *rows*, so we group the flat client list into
// rows of `columnCount` items and virtualise those rows. This keeps the grid
// layout fully CSS-driven (auto-fill) while the virtualiser only mounts the
// rows currently in view.

function useColumnCount(containerRef: React.RefObject<HTMLDivElement>) {
    const [cols, setCols] = useState(3);

    useEffect(() => {
        if (!containerRef.current) return;
        const ro = new ResizeObserver(([entry]) => {
            const w = entry.contentRect.width;
            // Mirrors the grid: minmax(240px, 1fr)
            setCols(Math.max(1, Math.floor(w / 240)));
        });
        ro.observe(containerRef.current);
        return () => ro.disconnect();
    }, [containerRef]);

    return cols;
}

function VirtualGrid({
    clients,
    visibleCount,
    hasMore,
    onDelete,
    onLoadMore,
}: {
    clients: ClientData[];
    visibleCount: number;
    hasMore: boolean;
    onDelete: (c: ClientData) => void;
    onLoadMore: () => void;
}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const columnCount = useColumnCount(containerRef);

    // Only show the slice that has been "revealed" by scrolling
    const visibleClients = clients.slice(0, visibleCount);

    // Group into rows
    const rows = useMemo(() => {
        const result: ClientData[][] = [];
        for (let i = 0; i < visibleClients.length; i += columnCount) {
            result.push(visibleClients.slice(i, i + columnCount));
        }
        return result;
    }, [visibleClients, columnCount]);

    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => containerRef.current,
        estimateSize: () => CARD_ESTIMATE_PX + 16, // card height + gap
        overscan: 3,
    });

    // ── Sentinel lives INSIDE the scroll container so IntersectionObserver
    //    uses the correct root (the scrollable div, not the page).
    useEffect(() => {
        const sentinel = sentinelRef.current;
        const scroller = containerRef.current;
        if (!sentinel || !scroller) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && hasMore) {
                    onLoadMore();
                }
            },
            {
                root: scroller,   // ← key: observe relative to the scroll container
                threshold: 0.1,
            },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, onLoadMore]);

    const totalHeight = virtualizer.getTotalSize();

    return (
        <div
            ref={containerRef}
            className="overflow-auto"
            style={{ height: "calc(100vh - 220px)" }}
        >
            {/* Virtualised rows */}
            <div style={{ height: totalHeight, position: "relative" }}>
                {virtualizer.getVirtualItems().map((virtualRow) => {
                    const row = rows[virtualRow.index];
                    return (
                        <div
                            key={virtualRow.key}
                            data-index={virtualRow.index}
                            ref={virtualizer.measureElement}
                            style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 pb-4">
                                {row.map((client) => (
                                    <ClientCard
                                        key={client.id}
                                        client={client}
                                        onDelete={onDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Sentinel sits after the virtual content, still inside the scroller */}
            <div ref={sentinelRef} className="h-px" />

            {hasMore && (
                <div className="flex items-center justify-center py-4 text-muted-foreground">
                    <Loader2 size={18} className="animate-spin" />
                </div>
            )}

            {!hasMore && clients.length > PAGE_SIZE && (
                <p className="text-center text-xs text-muted-foreground py-4 opacity-60">
                    All {clients.length} clients loaded
                </p>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Clients() {
    const navigate = useNavigate();
    const { data: clients, isLoading, isError, refetch } = useClients();
    const deleteClient = useDeleteClient();

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<FilterTab>("all");
    const [deleting, setDeleting] = useState<ClientData | null>(null);

    // ── Filtering ──────────────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return (clients ?? []).filter((c) => {
            const matchSearch =
                !q ||
                c.name.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q) ||
                c.location?.toLowerCase().includes(q) ||
                c.contact_number.toLowerCase().includes(q);
            const matchFilter =
                filter === "all" ||
                (filter === "with-servers" && c.servers_count > 0) ||
                (filter === "no-servers" && c.servers_count === 0);
            return matchSearch && matchFilter;
        });
    }, [search, filter, clients]);

    // ── Infinite-scroll page tracking ─────────────────────────────────────────
    // `visibleCount` tracks how many items from `filtered` are currently shown.
    // When the sentinel enters the viewport we bump it by PAGE_SIZE.
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    // Reset to first page whenever the filtered result changes (search / filter)
    useEffect(() => {
        setVisibleCount(PAGE_SIZE);
    }, [filtered]);

    const hasMore = visibleCount < filtered.length;

    const loadMore = useCallback(() => {
        setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filtered.length));
    }, [filtered.length]);

    // ── Filter options ─────────────────────────────────────────────────────────
    const clientsWithServers = clients?.filter((c) => c.servers_count > 0).length ?? 0;
    const clientsWithoutServers = clients?.filter((c) => c.servers_count === 0).length ?? 0;

    const filterOptions = [
        { label: "All", value: "all" as FilterTab, count: clients?.length ?? 0 },
        { label: "With Servers", value: "with-servers" as FilterTab, count: clientsWithServers },
        { label: "No Servers", value: "no-servers" as FilterTab, count: clientsWithoutServers },
    ];

    const currentFilterLabel =
        filterOptions.find((o) => o.value === filter)?.label ?? "All";

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
            {/* ── Header ── */}
            <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div>
                    <div className="flex items-start justify-between gap-4 py-3">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                                <Landmark className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold tracking-tight">
                                    Client Management
                                </h1>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Manage client accounts and their associated servers.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="py-6 w-full flex-1 min-h-0 overflow-hidden flex flex-col gap-5">
                {/* ── Toolbar ── */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="relative flex-1 max-w-xs">
                            <Search
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                            />
                            <input
                                type="text"
                                placeholder="Search clients…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground transition-colors"
                            />
                        </div>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon={<Filter size={15} />}
                                    className="gap-1 h-9"
                                >
                                    {currentFilterLabel}
                                    <ChevronDown size={15} />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-48 p-1">
                                {filterOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setFilter(option.value)}
                                        className={cn(
                                            "flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                                            filter === option.value
                                                ? "bg-accent text-accent-foreground"
                                                : "hover:bg-muted text-foreground",
                                        )}
                                    >
                                        <span>{option.label}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {option.count}
                                        </span>
                                    </button>
                                ))}
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Button
                        icon={<Plus size={15} />}
                        label="Add client"
                        onClick={() => navigate("/clients/create")}
                    />
                </div>

                {/* ── Error state ── */}
                {isError && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                        <Landmark size={32} className="opacity-20" />
                        <p className="text-sm">Failed to load clients.</p>
                        <Button
                            variant="outline"
                            size="sm"
                            icon={<RefreshCw size={14} />}
                            label="Retry"
                            onClick={() => refetch()}
                        />
                    </div>
                )}

                {/* ── Count label ── */}
                {!isLoading && !isError && (
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                        {filtered.length} client{filtered.length !== 1 ? "s" : ""}
                        {visibleCount < filtered.length && (
                            <span className="normal-case ml-1 opacity-60">
                                — showing {visibleCount}
                            </span>
                        )}
                    </p>
                )}

                {/* ── Loading skeleton ── */}
                {isLoading && <SkeletonGrid />}

                {/* ── Empty state ── */}
                {!isLoading && !isError && clients && filtered.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                        <Landmark size={40} className="opacity-20" />
                        <p className="text-sm font-medium">
                            {search || filter !== "all"
                                ? "No clients match your search."
                                : "No clients yet."}
                        </p>
                        <p className="text-xs opacity-60">
                            {search || filter !== "all"
                                ? "Try adjusting your filters or search term."
                                : "Add your first client to get started."}
                        </p>
                        {!search && filter === "all" && (
                            <Button
                                size="sm"
                                icon={<Plus size={14} />}
                                label="Add client"
                                onClick={() => navigate("/clients/create")}
                            />
                        )}
                    </div>
                )}

                {/* ── Virtualised grid + infinite scroll ── */}
                {!isLoading && !isError && filtered.length > 0 && (
                    <div className="flex flex-col gap-0 flex-1 min-h-0">
                        <VirtualGrid
                            clients={filtered}
                            visibleCount={visibleCount}
                            hasMore={hasMore}
                            onDelete={setDeleting}
                            onLoadMore={loadMore}
                        />
                    </div>
                )}

                {/* ── Delete dialog ── */}
                <Dialog
                    open={!!deleting}
                    onOpenChange={(open) => {
                        if (!open) setDeleting(null);
                    }}
                >
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Delete Client</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete{" "}
                            <span className="font-medium text-foreground">
                                {deleting?.name}
                            </span>
                            ? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <DialogClose asChild>
                                <Button
                                    variant="outline"
                                    label="Cancel"
                                    onClick={() => setDeleting(null)}
                                />
                            </DialogClose>
                            <Button
                                variant="danger"
                                label={deleteClient.isPending ? "Deleting…" : "Delete"}
                                disabled={deleteClient.isPending}
                                onClick={async () => {
                                    if (!deleting) return;
                                    try {
                                        await deleteClient.mutateAsync(deleting.id);
                                        toast.success(`${deleting.name} has been deleted.`);
                                        setDeleting(null);
                                    } catch {
                                        toast.error("Failed to delete client. Please try again.");
                                    }
                                }}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}