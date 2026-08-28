import { useEffect, useState } from "react";
import {
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";
import type { PaginationMeta } from "@/pages/system-logs/hooks/usePaginatedTable";

interface PaginationControlsProps {
    meta: PaginationMeta;
    onFirst: () => void;
    onPrev: () => void;
    onNext: () => void;
    onLast: () => void;
    onPage: (page: number) => void;
    perPage?: number;
    onPerPageChange?: (perPage: number) => void;
    unit?: string;
}

export function PaginationControls({
    meta,
    onFirst,
    onPrev,
    onNext,
    onLast,
    onPage,
    perPage,
    onPerPageChange,
    unit,
}: PaginationControlsProps) {
    const start =
        meta.total === 0 ? 0 : (meta.page - 1) * meta.perPage + 1;
    const end =
        meta.total === null
            ? meta.page * meta.perPage
            : Math.min(meta.page * meta.perPage, meta.total);

    const [draft, setDraft] = useState(String(meta.page));
    useEffect(() => setDraft(String(meta.page)), [meta.page]);

    const commit = () => {
        const n = Number.parseInt(draft, 10);
        const max = meta.pageCount ?? meta.page;
        if (Number.isFinite(n)) {
            onPage(Math.min(Math.max(n, 1), max));
        } else {
            setDraft(String(meta.page));
        }
    };

    const [perPageDraft, setPerPageDraft] = useState(
        perPage !== undefined ? String(perPage) : "15",
    );
    useEffect(() => {
        if (perPage !== undefined) setPerPageDraft(String(perPage));
    }, [perPage]);
    const commitPerPage = () => {
        const n = Number.parseInt(perPageDraft, 10);
        if (Number.isFinite(n)) {
            const clamped = Math.min(Math.max(n, 1), 200);
            onPerPageChange?.(clamped);
            setPerPageDraft(String(clamped));
        } else {
            setPerPageDraft(String(perPage ?? 15));
        }
    };

    const iconBtn =
        "p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:pointer-events-none transition-colors cursor-pointer";
    const jumpDisabled = meta.pageCount === null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/60 bg-muted/10 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
                <span>
                    Showing{" "}
                    <strong className="text-foreground">{start}</strong>–
                    <strong className="text-foreground">{end}</strong>
                    {meta.total !== null && (
                        <>
                            {" "}
                            of{" "}
                            <strong className="text-foreground">
                                {meta.total}
                            </strong>
                        </>
                    )}
                    {unit ? ` ${unit}` : ""}
                </span>
                {perPage !== undefined && onPerPageChange && (
                    <>
                        <span className="hidden sm:inline text-border">|</span>
                        <span className="flex items-center gap-1.5">
                            Per page:
                            <input
                                type="number"
                                min={1}
                                max={200}
                                value={perPageDraft}
                                onChange={(e) => setPerPageDraft(e.target.value)}
                                onBlur={commitPerPage}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") commitPerPage();
                                }}
                                aria-label="Per page"
                                className="w-14 h-7 px-2 rounded border border-border/60 bg-background text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                        </span>
                    </>
                )}
            </div>

            <div className="flex items-center gap-1">
                <button
                    type="button"
                    onClick={onFirst}
                    disabled={!meta.hasPrevious}
                    className={iconBtn}
                    title="First page"
                >
                    <ChevronsLeft className="size-4" />
                </button>
                <button
                    type="button"
                    onClick={onPrev}
                    disabled={!meta.hasPrevious}
                    className={iconBtn}
                    title="Previous page"
                >
                    <ChevronLeft className="size-4" />
                </button>
                <span className="flex items-center gap-1">
                    <input
                        value={draft}
                        disabled={jumpDisabled}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commit}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") commit();
                        }}
                        aria-label="Page"
                        className="w-9 h-6 rounded border border-border bg-background text-center text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-40"
                    />
                    <span>/ {meta.pageCount ?? "?"}</span>
                </span>
                <button
                    type="button"
                    onClick={onNext}
                    disabled={!meta.hasNext}
                    className={iconBtn}
                    title="Next page"
                >
                    <ChevronRight className="size-4" />
                </button>
                <button
                    type="button"
                    onClick={onLast}
                    disabled={!meta.hasNext || meta.pageCount === null}
                    className={iconBtn}
                    title="Last page"
                >
                    <ChevronsRight className="size-4" />
                </button>
            </div>
        </div>
    );
}
