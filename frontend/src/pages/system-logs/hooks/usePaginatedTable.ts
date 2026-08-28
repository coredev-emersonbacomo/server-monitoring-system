import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { useState } from "react";
import api from "@/api/api";

export interface PaginationMeta {
    mode: "page" | "cursor";
    perPage: number;
    hasPrevious: boolean;
    hasNext: boolean;
    total: number | null;
    page: number;
    pageCount: number | null;
    nextCursor: string | null;
    previousCursor: string | null;
}

type RawPagination = {
    mode?: "page" | "cursor";
    per_page?: number;
    has_previous?: boolean;
    has_next?: boolean;
    total?: number;
    current_page?: number;
    last_page?: number;
    next_cursor?: string | null;
    previous_cursor?: string | null;
};

type RawEnvelope = {
    data?: unknown[];
    prev?: number | null;
    next?: number | null;
    total?: number;
    per_page?: number;
    meta?: { pagination?: RawPagination };
};

const PAGE_KEYS = ["page", "per_page", "cursor"];

/**
 * Drives a server-paginated table. Filter/sort state lives in the browser URL
 * via react-router `useSearchParams`; the fetch is issued against `url`.
 *
 * Supports two backend modes (signalled by `meta.pagination.mode`):
 *  - "page":  offset pagination (`current_page`/`last_page`/`total`).
 *  - "cursor": cursor pagination (`next_cursor`/`previous_cursor`, no total).
 * If the backend returns the flat `{ prev, next, total, per_page }` envelope
 * (activity logs), it is treated as page mode.
 */
export function usePaginatedTable<T>(
    url: string,
    fixedParams: Record<string, string | undefined> = {},
) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [cursorPage, setCursorPage] = useState(1);

    const setParams = (updates: Record<string, string | null>) => {
        const next = new URLSearchParams(searchParams);
        for (const [key, value] of Object.entries(updates)) {
            if (value === null || value === "") {
                next.delete(key);
            } else {
                next.set(key, value);
            }
            if (!PAGE_KEYS.includes(key)) {
                next.delete("page");
                next.delete("cursor");
            }
        }
        setSearchParams(next);
    };

    const queryParams: Record<string, string> = {};
    for (const [key, value] of Object.entries(fixedParams)) {
        if (value !== undefined && value !== null && value !== "") {
            queryParams[key] = value;
        }
    }
    searchParams.forEach((value, key) => {
        queryParams[key] = value;
    });

    const query = useQuery<RawEnvelope | null>({
        queryKey: ["paginated", url, fixedParams, searchParams.toString()],
        queryFn: async () => {
            const { data, error } = await api.GET(
                url as never,
                { params: { query: queryParams } } as never,
            );
            if (error) throw error;
            return (data as unknown as RawEnvelope) ?? null;
        },
    });

    const raw = query.data;
    const mode = raw?.meta?.pagination?.mode ?? "page";

    let meta: PaginationMeta;
    if (raw?.meta?.pagination) {
        const p = raw.meta.pagination;
        if (mode === "cursor") {
            meta = {
                mode: "cursor",
                perPage: p.per_page ?? 15,
                hasPrevious: p.has_previous ?? false,
                hasNext: p.has_next ?? false,
                total: null,
                page: cursorPage,
                pageCount: null,
                nextCursor: p.next_cursor ?? null,
                previousCursor: p.previous_cursor ?? null,
            };
        } else {
            meta = {
                mode: "page",
                perPage: p.per_page ?? 15,
                hasPrevious: p.has_previous ?? false,
                hasNext: p.has_next ?? false,
                total: p.total ?? 0,
                page: p.current_page ?? 1,
                pageCount: p.last_page ?? 1,
                nextCursor: null,
                previousCursor: null,
            };
        }
    } else {
        const perPage = raw?.per_page ?? 15;
        const total = raw?.total ?? 0;
        meta = {
            mode: "page",
            perPage,
            hasPrevious: raw?.prev !== null && raw?.prev !== undefined,
            hasNext: raw?.next !== null && raw?.next !== undefined,
            total,
            page: Number(searchParams.get("page") ?? "1"),
            pageCount: total > 0 ? Math.max(1, Math.ceil(total / perPage)) : 1,
            nextCursor: null,
            previousCursor: null,
        };
    }

    const data = (raw?.data as T[]) ?? [];

    return {
        data,
        isLoading: query.isLoading,
        meta,
        setParams,
        goNext: () => {
            if (meta.mode === "cursor") {
                setCursorPage((c) => c + 1);
                setParams({
                    cursor: meta.nextCursor,
                    previous_cursor: null,
                    page: null,
                });
            } else {
                setParams({ page: String((meta.page ?? 1) + 1) });
            }
        },
        goPrev: () => {
            if (meta.mode === "cursor") {
                setCursorPage((c) => Math.max(1, c - 1));
                setParams({
                    previous_cursor: meta.previousCursor,
                    cursor: null,
                    page: null,
                });
            } else {
                setParams({ page: String(Math.max(1, (meta.page ?? 1) - 1)) });
            }
        },
        goFirst: () => {
            setCursorPage(1);
            setParams({ page: null, cursor: null, previous_cursor: null });
        },
        goLast: () => {
            if (meta.mode === "page" && meta.pageCount) {
                setParams({ page: String(meta.pageCount), cursor: null, previous_cursor: null });
            }
        },
        goToPage: (page: number) => {
            setCursorPage(page);
            setParams({ page: String(page), cursor: null, previous_cursor: null });
        },
    };
}
