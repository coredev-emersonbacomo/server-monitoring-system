// Path: frontend/src/pages/clients/index/index.tsx
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Landmark, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useClients } from "@/hooks/useClients";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import IndexHeader from "@/components/IndexHeader";
import IndexToolbar from "@/components/IndexToolbar";
import type { FilterOption, SortOption } from "@/components/IndexToolbar";
import type { ClientData } from "@/types/models";
import { ClientCard, SkeletonGrid } from "./components/ClientCard";
import { DeleteClientIndexModal } from "./components/DeleteClientIndexModal";
import { useVirtualizer } from "@tanstack/react-virtual";
type FilterTab = "all" | "with-servers" | "no-servers" | "archived";

const PAGE_SIZE = 12;
const CARD_ESTIMATE_PX = 300;

function useColumnCount(scrollRef: React.RefObject<HTMLElement | null>) {
    const [cols, setCols] = useState(3);

    useEffect(() => {
        if (!scrollRef.current) return;
        const ro = new ResizeObserver(([entry]) => {
            const w = entry.contentRect.width;
            const MIN_CARD = 240;
            const GAP = 16;
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
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                                    gap: "16px",
                                    paddingBottom: "16px",
                                }}
                            >
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
            <div ref={sentinelRef} className="h-4" />
        </div>
    );
}

export default function ClientsIndex() {
    const navigate = useNavigate();
    const { data: clients, isLoading, isError } = useClients();

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<FilterTab>("all");
    const [sortField, setSortField] = useState<string>("name");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
    const [deleting, setDeleting] = useState<ClientData | null>(null);
    const [page, setPage] = useState(1);

    const mainRef = useRef<HTMLElement>(null);

    const counts = useMemo(() => {
        if (!clients)
            return {
                all: 0,
                "with-servers": 0,
                "no-servers": 0,
                archived: 0,
            };
        const active = clients.filter((c) => c.record_status !== "archived");
        return {
            all: active.length,
            "with-servers": active.filter((c) => c.servers_count > 0).length,
            "no-servers": active.filter((c) => c.servers_count === 0).length,
            archived: clients.filter((c) => c.record_status === "archived").length,
        };
    }, [clients]);

    const filterOptions: FilterOption[] = useMemo(
        () => [
            { label: "All", value: "all", count: counts.all },
            {
                label: "With Servers",
                value: "with-servers",
                count: counts["with-servers"],
            },
            {
                label: "No Servers",
                value: "no-servers",
                count: counts["no-servers"],
            },
            {
                label: "Archived",
                value: "archived",
                count: counts.archived,
            },
        ],
        [counts],
    );

    const sortOptions: SortOption[] = [
        { label: "Name", value: "name" },
        { label: "Servers count", value: "servers_count" },
        { label: "SecOps count", value: "secops_count" },
    ];
    const currentSortLabel =
        sortOptions.find((o) => o.value === sortField)?.label ?? "Name";

    const handleSearchChange = useCallback((val: string) => {
        setSearch(val);
        setPage(1);
    }, []);

    const handleFilterChange = useCallback((val: string) => {
        setFilter(val as FilterTab);
        setPage(1);
    }, []);

    const filtered = useMemo(() => {
        if (!clients) return [];
        let list = [...clients];

        if (filter === "archived") {
            list = list.filter((c) => c.record_status === "archived");
        } else {
            list = list.filter((c) => c.record_status !== "archived");
            if (filter === "with-servers") {
                list = list.filter((c) => c.servers_count > 0);
            } else if (filter === "no-servers") {
                list = list.filter((c) => c.servers_count === 0);
            }
        }

        const q = search.toLowerCase().trim();
        if (q) {
            list = list.filter(
                (c) =>
                    c.name.toLowerCase().includes(q) ||
                    (c.description && c.description.toLowerCase().includes(q)),
            );
        }

        list.sort((a, b) => {
            let aVal: unknown = a[sortField as keyof ClientData];
            let bVal: unknown = b[sortField as keyof ClientData];
            if (typeof aVal === "string") {
                aVal = aVal.toLowerCase();
                bVal = typeof bVal === "string" ? bVal.toLowerCase() : "";
            }
            if (aVal < (bVal as typeof aVal)) return sortDir === "asc" ? -1 : 1;
            if (aVal > (bVal as typeof aVal)) return sortDir === "asc" ? 1 : -1;
            return 0;
        });

        return list;
    }, [clients, filter, search, sortField, sortDir]);

    const visibleCount = page * PAGE_SIZE;
    const hasMore = visibleCount < filtered.length;

    const loadMore = useCallback(() => {
        setPage((prev) => prev + 1);
    }, []);

    return (
        <PageLayout>
            <IndexHeader icon={Landmark} title="Clients" />

            <main ref={mainRef} className="w-full flex-1 min-h-0 flex flex-col gap-5">
                <IndexToolbar
                    search={search}
                    onSearchChange={handleSearchChange}
                    searchPlaceholder="Search clients…"
                    filterOptions={filterOptions}
                    filter={filter}
                    onFilterChange={handleFilterChange}
                    sortOptions={sortOptions}
                    sortField={sortField}
                    onSortFieldChange={(val) => {
                        setSortField(val);
                        setPage(1);
                    }}
                    sortDir={sortDir}
                    onSortDirChange={() => {
                        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                        setPage(1);
                    }}
                    sortLabel={currentSortLabel}
                    filterLabel="Status"
                    onCreate={() => navigate("/clients/create")}
                    createLabel="Add client"
                />

                {!isLoading && !isError && (
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                        {filtered.length} client{filtered.length !== 1 ? "s" : ""}
                        {hasMore && (
                            <span className="normal-case ml-1 opacity-60">
                                — showing {visibleCount}
                            </span>
                        )}
                    </p>
                )}

                {isLoading && <SkeletonGrid />}

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

                <DeleteClientIndexModal
                    client={deleting}
                    onClose={() => setDeleting(null)}
                />
            </main>
        </PageLayout>
    );
}
