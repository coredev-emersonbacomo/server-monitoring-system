import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import {
    Landmark,
    RefreshCw,
    Loader2,
    Plus,
    MoreVertical,
    Trash2,
    Server,
    Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useNavigate, Link } from "react-router-dom";
import { useClients, useDeleteClient } from "@/hooks/useClients";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import IndexHeader from "@/components/IndexHeader";
import IndexToolbar from "@/components/IndexToolbar";
import type { FilterOption, SortOption } from "@/components/IndexToolbar";
import type { ClientData } from "@/types/models";

type FilterTab = "all" | "with-servers" | "no-servers" | "archived";

// How many cards to reveal per "page". Tune freely.
const PAGE_SIZE = 12;

// Approximate card height + gap in px — used by the virtualizer for estimation.
// The virtualizer will measure real heights after mount, so this just avoids
// a large layout jump on first render.

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
            to={`/clients/${client.uuid}`}
            className="block rounded-lg transition-transform duration-200 hover:-translate-y-1"
        >
            <div className="relative size-full bg-card rounded-lg border border-border p-6 shadow-sm flex flex-col items-center font-sans gap-3 transition-shadow hover:shadow-md">
                <div className="absolute top-3 left-4 right-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-emerald-500 leading-none text-xs">
                                {client.servers_online_count ?? 0}
                            </span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                            <span className="text-red-500 leading-none text-xs">
                                {client.servers_count -
                                    client.servers_online_count}
                            </span>
                        </span>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                className="text-muted-foreground hover:text-foreground transition-colors pl-1 pr-0 py-1 rounded-md cursor-pointer"
                                tabIndex={-1}
                            >
                                <MoreVertical className="size-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={4}>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    // Defer so Radix closes the DropdownMenu (and
                                    // restores body pointer-events) before the
                                    // Dialog increments its overlay counter.
                                    setTimeout(() => onDelete(client), 0);
                                }}
                                className="text-destructive focus:text-destructive cursor-pointer"
                            >
                                <Trash2 className="size-3.5" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="mt-4 mb-1">
                    <img
                        src={client.banner_image_url}
                        alt={client.name}
                        className="w-20 h-20 rounded-full object-cover border border-border shadow-sm"
                    />
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground leading-none">
                    <Server className="size-4 shrink-0" />
                    {client.servers_count ?? 0}
                    <span className="flex items-center gap-1.5">
                        <Users className="size-4 shrink-0" />
                        {client.secops_count ?? 0}
                    </span>
                </div>

                <div className="text-center w-full flex flex-col items-center gap-1.5">
                    {client.name}
                    <div className="flex flex-col items-center gap-1.5 mt-1 text-center w-full">
                        <p className="text-sm text-muted-foreground text-center line-clamp-3 break-all">
                            {client.description}
                        </p>
                    </div>
                </div>
            </div>
        </Link>
    );
}

import { useVirtualizer } from "@tanstack/react-virtual";

// Approximate card height + gap in px — the virtualizer measures real
// heights after mount, this just avoids a big layout jump on first render.
const CARD_ESTIMATE_PX = 300;

function useColumnCount(scrollRef: React.RefObject<HTMLElement | null>) {
    const [cols, setCols] = useState(3);

    useEffect(() => {
        if (!scrollRef.current) return;
        const ro = new ResizeObserver(([entry]) => {
            const w = entry.contentRect.width;
            const MIN_CARD = 240;
            const GAP = 16; // matches gap-4
            // Same math the browser uses for repeat(auto-fill, minmax(240px, 1fr))
            setCols(Math.max(1, Math.floor((w + GAP) / (MIN_CARD + GAP))));
        });
        ro.observe(scrollRef.current);
        return () => ro.disconnect();
    }, [scrollRef]);

    return cols;
}

function ClientGrid({
    clients,
    visibleCount,
    hasMore,
    onDelete,
    onLoadMore,
    scrollRef,
}: {
    clients: ClientData[];
    visibleCount: number;
    hasMore: boolean;
    onDelete: (c: ClientData) => void;
    onLoadMore: () => void;
    scrollRef: React.RefObject<HTMLElement | null>;
}) {
    "use no memo";
    const sentinelRef = useRef<HTMLDivElement>(null);
    const columnCount = useColumnCount(scrollRef);

    const visibleClients = clients.slice(0, visibleCount);

    const rows = useMemo(() => {
        const result: ClientData[][] = [];
        for (let i = 0; i < visibleClients.length; i += columnCount) {
            result.push(visibleClients.slice(i, i + columnCount));
        }
        return result;
    }, [visibleClients, columnCount]);

    // eslint-disable-next-line react-hooks/incompatible-library
    const virtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => document.documentElement,
        estimateSize: () => CARD_ESTIMATE_PX + 16,
        overscan: 3,
    });

    useEffect(() => {
        const sentinel = sentinelRef.current;
        if (!sentinel) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting && hasMore) {
                    onLoadMore();
                }
            },
            { threshold: 0.1 },
        );

        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [hasMore, onLoadMore]);

    const totalHeight = virtualizer.getTotalSize();

    return (
        <div>
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
                                        key={client.uuid}
                                        client={client}
                                        onDelete={onDelete}
                                    />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

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
    const mainRef = useRef<HTMLElement>(null);

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<FilterTab>("all");
    const [sortField, setSortField] = useState<string>("created_at");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [deleting, setDeleting] = useState<ClientData | null>(null);
    const [confirmText, setConfirmText] = useState("");
    // ── Filtering & Sorting ────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        const result = (clients ?? []).filter((c) => {
            const matchSearch =
                !q ||
                c.name.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q) ||
                c.location?.toLowerCase().includes(q) ||
                c.contact_number.toLowerCase().includes(q);
            const matchFilter =
                filter === "all" ||
                (filter === "with-servers" && c.servers_count > 0) ||
                (filter === "no-servers" && c.servers_count === 0) ||
                (filter === "archived" && c.record_status === "archived");
            return matchSearch && matchFilter;
        });
        return [...result].sort((a, b) => {
            const cmp = (() => {
                switch (sortField) {
                    case "name":
                        return a.name.localeCompare(b.name);
                    case "email":
                        return a.email.localeCompare(b.email);
                    case "location":
                        return (a.location ?? "").localeCompare(
                            b.location ?? "",
                        );
                    default:
                        return a.created_at.localeCompare(b.created_at);
                }
            })();
            return sortDir === "desc" ? -cmp : cmp;
        });
    }, [search, filter, sortField, sortDir, clients]);

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
    const clientsWithServers =
        clients?.filter((c) => c.servers_count > 0).length ?? 0;
    const clientsWithoutServers =
        clients?.filter((c) => c.servers_count === 0).length ?? 0;
    const archivedClients =
        clients?.filter((c) => c.record_status === "archived").length ?? 0;

    const filterOptions = [
        {
            label: "All",
            value: "all" as FilterTab,
            count: clients?.length ?? 0,
        },
        {
            label: "With Servers",
            value: "with-servers" as FilterTab,
            count: clientsWithServers,
        },
        {
            label: "No Servers",
            value: "no-servers" as FilterTab,
            count: clientsWithoutServers,
        },
        {
            label: "Archived",
            value: "archived" as FilterTab,
            count: archivedClients,
        },
    ];

    const sortOptions = [
        { label: "Created At", value: "created_at" },
        { label: "Name", value: "name" },
        { label: "Email", value: "email" },
        { label: "Location", value: "location" },
    ];

    const currentFilterLabel =
        filterOptions.find((o) => o.value === filter)?.label ?? "All";
    const currentSortLabel =
        sortOptions.find((o) => o.value === sortField)?.label ?? "";

    return (
        <PageLayout>
            <IndexHeader
                icon={Landmark}
                title="Client Management"
                description="Manage client accounts and their associated servers."
            />

            <main
                ref={mainRef}
                className="w-full flex-1 min-h-0 flex flex-col gap-5"
            >
                {/* ── Toolbar ── */}
                <IndexToolbar
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search clients…"
                    filterOptions={filterOptions as FilterOption[]}
                    filter={filter}
                    onFilterChange={(v) => setFilter(v as typeof filter)}
                    filterLabel={currentFilterLabel}
                    sortOptions={sortOptions as SortOption[]}
                    sortField={sortField}
                    onSortFieldChange={setSortField}
                    sortDir={sortDir}
                    onSortDirChange={() =>
                        setSortDir((d) => (d === "desc" ? "asc" : "desc"))
                    }
                    sortLabel={currentSortLabel}
                    onCreate={() => navigate("/clients/create")}
                    createLabel="Add client"
                />

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
                        {filtered.length} client
                        {filtered.length !== 1 ? "s" : ""}
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
                        <ClientGrid
                            clients={filtered}
                            visibleCount={visibleCount}
                            hasMore={hasMore}
                            onDelete={setDeleting}
                            onLoadMore={loadMore}
                            scrollRef={mainRef}
                        />
                    </div>
                )}

                {/* ── Delete dialog ── */}
                <Dialog
                    open={!!deleting}
                    onOpenChange={(open) => {
                        if (!open) {
                            setDeleting(null);
                            setConfirmText("");
                        }
                    }}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-destructive">
                                <Trash2 size={16} />
                                Delete Client
                            </DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                            This will permanently delete{" "}
                            <strong className="text-foreground">
                                {deleting?.name}
                            </span>
                            ? This action cannot be undone.
                        </p>
                        <div className="flex flex-col gap-1.5 mt-2 mb-4">
                            <label className="text-xs text-muted-foreground">
                                Type{" "}
                                <span className="font-medium text-foreground">
                                    {deleting?.name}
                                </span>{" "}
                                to confirm.
                            </label>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={(e) =>
                                    setConfirmText(e.target.value)
                                }
                                autoComplete="off"
                                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                placeholder={deleting?.name}
                            />
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <DialogClose asChild>
                                <Button
                                    variant="outline"
                                    label="Cancel"
                                    onClick={() => {
                                        setDeleting(null);
                                        setDeleteConfirmText("");
                                    }}
                                />
                            </DialogClose>
                            <Button
                                variant="danger"
                                label={
                                    deleteClient.isPending
                                        ? "Deleting…"
                                        : "Delete"
                                }
                                disabled={
                                    deleteClient.isPending ||
                                    confirmText !== deleting?.name
                                }
                                onClick={async () => {
                                    if (!deleting || deleteConfirmText !== deleting.name) return;
                                    try {
                                        await deleteClient.mutateAsync(
                                            deleting.uuid,
                                        );
                                        toast.success(
                                            `${deleting.name} has been deleted.`,
                                        );
                                        setDeleting(null);
                                        setConfirmText("");
                                    } catch {
                                        toast.error(
                                            err?.response?.data?.message ||
                                                err?.message ||
                                                "Failed to delete client. Please try again.",
                                        );
                                    }
                                }}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </main>
        </PageLayout>
    );
}
