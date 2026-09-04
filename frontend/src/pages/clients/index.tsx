// Path: frontend/src/pages/clients/index.tsx
import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { Landmark, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useClients } from "@/hooks/useClients";
import { useUrlState } from "@/hooks/useUrlState";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";
import IndexHeader from "@/components/IndexHeader";
import IndexToolbar from "@/components/IndexToolbar";
import type { FilterOption, SortOption } from "@/components/IndexToolbar";
import type { ClientData } from "@/types/models";
import { ClientCard, SkeletonGrid } from "./components/ClientCard";
import { DeleteClientIndexModal } from "./components/DeleteClientIndexModal";
import { useVirtualizer } from "@tanstack/react-virtual";
type FilterTab = "all" | "assigned" | "with-servers" | "no-servers" | "archived";

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
    useDocumentTitle("Clients");
    const navigate = useNavigate();
    const [s, setS] = useUrlState({
        q: { default: "" },
        filter: { default: "all" as FilterTab },
        sort: { default: "name" },
        dir: { default: "asc" as "asc" | "desc" },
        page: { default: 1, parse: (v) => Number(v) },
        per_page: { default: 24, parse: (v) => Number(v) },
    });
    const { data: response, isLoading, isError } = useClients({
        q: s.q || undefined,
        filter: s.filter,
        sort: s.sort,
        dir: s.dir,
        page: s.page,
        per_page: s.per_page,
    });
    const [deleting, setDeleting] = useState<ClientData | null>(null);

    const mainRef = useRef<HTMLElement>(null);

    // Paginated response from server: { data, current_page, per_page, total, last_page, ... }
    const clients: ClientData[] = response?.data ?? [];
    const totalClients = response?.total ?? 0;

    const counts = useMemo(() => {
        if (!response)
            return {
                all: 0,
                assigned: 0,
                "with-servers": 0,
                "no-servers": 0,
                archived: 0,
            };
        const active = clients.filter((c) => c.record_status !== "archived");
        return {
            all: response.total,
            assigned: active.filter((c) => Boolean(c.is_assigned_to_current_user)).length,
            "with-servers": active.filter((c) => c.servers_count > 0).length,
            "no-servers": active.filter((c) => c.servers_count === 0).length,
            archived: clients.filter((c) => c.record_status === "archived").length,
        };
    }, [clients]);

    const filterOptions: FilterOption[] = useMemo(
        () => [
            { label: "All", value: "all", count: counts.all },
            {
                label: "Assigned to Me",
                value: "assigned",
                count: counts.assigned,
            },
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
        sortOptions.find((o) => o.value === s.sort)?.label ?? "Name";


    const handleFilterChange = useCallback(
        (val: string) => setS({ filter: val as FilterTab, page: 1 }),
        [setS],
    );

    // Server returns the already-filtered, sorted, paginated list
    const visible = clients;
    const visibleCount = visible.length;
    const hasMore = s.page * s.per_page < totalClients;

    const loadMore = useCallback(() => {
        setS({ page: s.page + 1 });
    }, [setS, s.page]);

    return (
        <PageLayout>
            <IndexHeader icon={Landmark} title="Clients" />

            <main ref={mainRef} className="w-full flex-1 min-h-0 flex flex-col gap-5">
                <IndexToolbar
                    searchParamName="q"
                    searchDebounceMs={300}
                    searchPlaceholder="Search clients…"
                    filterOptions={filterOptions}
                    filter={s.filter}
                    onFilterChange={handleFilterChange}
                    sortOptions={sortOptions}
                    sortField={s.sort}
                    onSortFieldChange={(val) => setS({ sort: val, page: 1 })}
                    sortDir={s.dir}
                    onSortDirChange={() =>
                        setS({ dir: s.dir === "asc" ? "desc" : "asc", page: 1 })
                    }
                    sortLabel={currentSortLabel}
                    filterLabel="Status"
                    onCreate={() => navigate("/clients/create")}
                    createLabel="Add client"
                />

                {!isLoading && !isError && (
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                        {totalClients} client{totalClients !== 1 ? "s" : ""}
                        {hasMore && (
                            <span className="normal-case ml-1 opacity-60">
                                — showing {visibleCount}
                            </span>
                        )}
                    </p>
                )}

                {isLoading && <SkeletonGrid />}

                {!isLoading && !isError && visible.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                        <Landmark size={40} className="opacity-20" />
                        <p className="text-sm font-medium">
                            {s.q || s.filter !== "all"
                                ? "No clients match your search."
                                : "No clients yet."}
                        </p>
                        <p className="text-xs opacity-60">
                            {s.q || s.filter !== "all"
                                ? "Try adjusting your filters or search term."
                                : "Add your first client to get started."}
                        </p>
                        {!s.q && s.filter === "all" && (
                            <Button
                                size="sm"
                                icon={<Plus size={14} />}
                                label="Add client"
                                onClick={() => navigate("/clients/create")}
                            />
                        )}
                    </div>
                )}

                {!isLoading && !isError && visible.length > 0 && (
                    <div className="flex flex-col gap-0 flex-1 min-h-0">
                        <ClientGrid
                            clients={visible}
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
