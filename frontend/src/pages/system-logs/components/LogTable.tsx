import { useEffect, useMemo, useRef, useState } from "react";
import {
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
    Search,
    Filter,
    Calendar,
    X,
    Check,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import type { ActivityLogData } from "../hooks/useActivityLogs";
import { usePaginatedTable } from "../hooks/usePaginatedTable";
import { PaginationControls } from "@/components/PaginationControls";
import {
    COLUMNS,
    type SortableKey,
    actionBadgeClass,
    formatDate,
    getLogSubjectInfo,
} from "../constants/logHelpers";

function RowSkeleton() {
    return (
        <tr className="animate-pulse">
            <td className="px-4 py-3">
                <div className="h-4 w-32 bg-muted rounded" />
            </td>
            <td className="px-4 py-3">
                <div className="h-4 w-24 bg-muted rounded" />
            </td>
            <td className="px-4 py-3">
                <div className="h-4 w-20 bg-muted rounded" />
            </td>
            <td className="px-4 py-3">
                <div className="h-4 w-16 bg-muted rounded" />
            </td>
            <td className="px-4 py-3 text-right">
                <div className="h-4 w-10 bg-muted rounded ml-auto" />
            </td>
        </tr>
    );
}

function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function HighlightMatch({
    text,
    query,
}: {
    text: string;
    query: string;
}) {
    const q = query.trim();
    if (!q || !text) return <>{text}</>;
    const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === q.toLowerCase() ? (
                    <mark
                        key={i}
                        className="bg-primary/20 text-foreground rounded-sm px-0.5"
                    >
                        {part}
                    </mark>
                ) : (
                    <span key={i}>{part}</span>
                ),
            )}
        </>
    );
}

interface LogTableProps {
    id?: string;
    url?: string;
    data: ActivityLogData[];
    total: number;
    currentPage: number;
    perPage: number;
    lastPage: number;
    isLoading: boolean;
    emptyMessage: string;
    search: string;
    onSearchChange: (search: string) => void;
    actionFilter: string;
    onActionFilterChange: (action: string) => void;
    userFilter: string;
    onUserFilterChange: (user: string) => void;
    startDate?: string;
    onStartDateChange: (date: string) => void;
    endDate?: string;
    onEndDateChange: (date: string) => void;
    sortField: SortableKey;
    sortDir: "asc" | "desc";
    onSort: (key: SortableKey) => void;
    onPageChange: (page: number) => void;
    onPerPageChange: (perPage: number) => void;
    onSelectLog: (log: ActivityLogData) => void;
    availableActions?: string[];
    availableUsers?: string[];
}

function LogTableBody({
    data,
    total,
    currentPage,
    perPage,
    lastPage,
    isLoading,
    emptyMessage,
    search,
    onSearchChange,
    actionFilter,
    onActionFilterChange,
    userFilter,
    onUserFilterChange,
    startDate = "",
    onStartDateChange,
    endDate = "",
    onEndDateChange,
    sortField,
    sortDir,
    onSort,
    onPageChange,
    onPerPageChange,
    onSelectLog,
    availableActions = ["created", "updated", "deleted", "login", "logout", "assigned", "removed"],
    availableUsers = [],
}: LogTableProps) {
    const [searchInput, setSearchInput] = useState(search);
    const searchTimer = useRef<number>();

    useEffect(() => {
        return () => window.clearTimeout(searchTimer.current);
    }, []);

    const commitSearch = (value: string) => {
        window.clearTimeout(searchTimer.current);
        searchTimer.current = window.setTimeout(() => {
            onSearchChange(value);
        }, 300);
    };

    /* Sync back when the URL value changes outside typing (e.g. page nav) but
       never while the user is actively typing — that would clobber the input. */
    useEffect(() => {
        if (searchTimer.current !== undefined) return;
        setSearchInput(search);
    }, [search]);

    const handleSearchChange = (value: string) => {
        setSearchInput(value);
        commitSearch(value);
    };

    const hasActiveFilters =
        actionFilter !== "all" ||
        userFilter !== "all" ||
        Boolean(searchInput) ||
        Boolean(startDate) ||
        Boolean(endDate);

    const clearFilters = () => {
        window.clearTimeout(searchTimer.current);
        searchTimer.current = undefined;
        setSearchInput("");
        onSearchChange("");
        onActionFilterChange("all");
        onUserFilterChange("all");
        onStartDateChange("");
        onEndDateChange("");
    };

    const dateLabel = useMemo(() => {
        if (startDate && endDate) {
            return `${startDate} to ${endDate}`;
        }
        if (startDate) return `From ${startDate}`;
        if (endDate) return `Until ${endDate}`;
        return "All Time";
    }, [startDate, endDate]);

    return (
        <div className="rounded-b-xl border border-border/60 bg-card overflow-hidden flex flex-col">
            {/* Toolbar: Search & Server-Queried Log Filters */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 border-b border-border/60 bg-muted/20">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-0">
                    {/* Search Input */}
                    <div className="relative flex-1 sm:max-w-xs min-w-[180px]">
                        <Search
                            size={13}
                            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />
                        <input
                            value={searchInput}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            placeholder="Search logs by subject, user, action..."
                            className="w-full bg-background border border-border/70 rounded-md pl-8 pr-7 h-8 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/60"
                        />
                        {searchInput && (
                            <button
                                type="button"
                                onClick={() => {
                                    window.clearTimeout(searchTimer.current);
                                    searchTimer.current = undefined;
                                    setSearchInput("");
                                    onSearchChange("");
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    {/* Date Picker Filter */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className={cn(
                                    "flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs font-medium transition-colors cursor-pointer",
                                    startDate || endDate
                                        ? "bg-primary/10 border-primary/40 text-primary"
                                        : "bg-background border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                )}
                            >
                                <Calendar size={13} className={startDate || endDate ? "text-primary" : "text-muted-foreground"} />
                                <span>
                                    Date:{" "}
                                    <strong className="text-foreground">
                                        {dateLabel}
                                    </strong>
                                </span>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-64 p-3 space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-muted-foreground">
                                    Start Date
                                </label>
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => onStartDateChange(e.target.value)}
                                    className="w-full bg-background border border-border/70 rounded-md px-2.5 h-8 text-xs text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-medium text-muted-foreground">
                                    End Date
                                </label>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => onEndDateChange(e.target.value)}
                                    className="w-full bg-background border border-border/70 rounded-md px-2.5 h-8 text-xs text-foreground [color-scheme:light] dark:[color-scheme:dark] focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                            {(startDate || endDate) && (
                                <div className="flex justify-end pt-1">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            onStartDateChange("");
                                            onEndDateChange("");
                                        }}
                                        className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                    >
                                        Clear Dates
                                    </button>
                                </div>
                            )}
                        </PopoverContent>
                    </Popover>

                    {/* Action Filter */}
                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className={cn(
                                    "flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs font-medium transition-colors cursor-pointer",
                                    actionFilter !== "all"
                                        ? "bg-primary/10 border-primary/40 text-primary"
                                        : "bg-background border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                )}
                            >
                                <Filter size={12} />
                                <span>
                                    Action:{" "}
                                    <strong className="text-foreground">
                                        {actionFilter === "all" ? "All" : actionFilter}
                                    </strong>
                                </span>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-44 p-1">
                            <button
                                type="button"
                                onClick={() => onActionFilterChange("all")}
                                className={cn(
                                    "flex items-center justify-between w-full px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer",
                                    actionFilter === "all"
                                        ? "bg-accent text-accent-foreground font-medium"
                                        : "hover:bg-muted text-foreground",
                                )}
                            >
                                <span>All Actions</span>
                                {actionFilter === "all" && <Check size={13} />}
                            </button>
                            {availableActions.map((act) => (
                                <button
                                    key={act}
                                    type="button"
                                    onClick={() => onActionFilterChange(act)}
                                    className={cn(
                                        "flex items-center justify-between w-full px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer",
                                        actionFilter === act
                                            ? "bg-accent text-accent-foreground font-medium"
                                            : "hover:bg-muted text-foreground",
                                    )}
                                >
                                    <span className="capitalize">{act}</span>
                                    {actionFilter === act && <Check size={13} />}
                                </button>
                            ))}
                        </PopoverContent>
                    </Popover>

                    {/* User / Actor Filter */}
                    {availableUsers.length > 0 && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <button
                                    type="button"
                                    className={cn(
                                        "flex items-center gap-1.5 h-8 px-2.5 rounded-md border text-xs font-medium transition-colors cursor-pointer",
                                        userFilter !== "all"
                                            ? "bg-primary/10 border-primary/40 text-primary"
                                            : "bg-background border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                    )}
                                >
                                    <span>
                                        User:{" "}
                                        <strong className="text-foreground">
                                            {userFilter === "all" ? "All" : userFilter}
                                        </strong>
                                    </span>
                                </button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-48 p-1 max-h-56 overflow-y-auto">
                                <button
                                    type="button"
                                    onClick={() => onUserFilterChange("all")}
                                    className={cn(
                                        "flex items-center justify-between w-full px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer",
                                        userFilter === "all"
                                            ? "bg-accent text-accent-foreground font-medium"
                                            : "hover:bg-muted text-foreground",
                                    )}
                                >
                                    <span>All Users</span>
                                    {userFilter === "all" && <Check size={13} />}
                                </button>
                                {availableUsers.map((u) => (
                                    <button
                                        key={u}
                                        type="button"
                                        onClick={() => onUserFilterChange(u)}
                                        className={cn(
                                            "flex items-center justify-between w-full px-2 py-1.5 rounded-md text-xs transition-colors cursor-pointer",
                                            userFilter === u
                                                ? "bg-accent text-accent-foreground font-medium"
                                                : "hover:bg-muted text-foreground",
                                        )}
                                    >
                                        <span className="truncate">{u}</span>
                                        {userFilter === u && <Check size={13} />}
                                    </button>
                                ))}
                            </PopoverContent>
                        </Popover>
                    )}

                    {/* Reset Button */}
                    {hasActiveFilters && (
                        <button
                            type="button"
                            onClick={clearFilters}
                            className="flex items-center gap-1 h-8 px-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                            <X size={12} />
                            <span>Reset</span>
                        </button>
                    )}
                </div>

                <div className="text-xs text-muted-foreground">
                    <span>
                        <strong className="text-foreground">{total}</strong> matching log{total !== 1 ? "s" : ""}
                    </span>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-border/60 bg-muted/20">
                            {COLUMNS.map((col) => {
                                const isActive = sortField === col.key;
                                return (
                                    <th
                                        key={col.key}
                                        onClick={() => onSort(col.key)}
                                        className="px-4 py-3 text-left cursor-pointer select-none group"
                                    >
                                        <span
                                            className={cn(
                                                "flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider transition-colors",
                                                isActive
                                                    ? "text-foreground"
                                                    : "text-muted-foreground group-hover:text-foreground",
                                            )}
                                        >
                                            {col.label}
                                            {isActive ? (
                                                sortDir === "asc" ? (
                                                    <ArrowUp size={12} />
                                                ) : (
                                                    <ArrowDown size={12} />
                                                )
                                            ) : (
                                                <ArrowUpDown
                                                    size={12}
                                                    className="opacity-0 group-hover:opacity-50 transition-opacity"
                                                />
                                            )}
                                        </span>
                                    </th>
                                );
                            })}
                            <th className="px-4 py-3 text-right">
                                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Details
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                        {isLoading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <RowSkeleton key={i} />
                            ))
                        ) : data.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={COLUMNS.length + 1}
                                    className="px-4 py-12 text-center text-sm text-muted-foreground"
                                >
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            data.map((log) => (
                                <tr
                                    key={log.id}
                                    className="hover:bg-muted/20 transition-colors"
                                >
                                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                        {formatDate(log.created_at)}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {(() => {
                                            const info = getLogSubjectInfo(log);
                                            const body = (
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-foreground font-medium truncate max-w-[220px]">
                                                        <HighlightMatch text={info.title} query={searchInput} />
                                                    </span>
                                                    {info.subtitle && (
                                                        <span className="text-[10px] text-muted-foreground font-normal">
                                                            <HighlightMatch text={info.subtitle} query={searchInput} />
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                            const short = (log.logable_type ?? "").split("\\").pop() ?? "";
                                            const linkable = ["Client", "Server"].includes(short) && !!log.logable_id;
                                            if (!linkable) return body;
                                            const href = short === "Client" ? `/clients/${log.logable_id}` : `/servers/${log.logable_id}`;
                                            return (
                                                <Link
                                                    to={href}
                                                    className="rounded px-1 -mx-1 text-foreground hover:bg-muted/70 hover:text-primary underline-offset-2 hover:underline transition-colors"
                                                    title={info.title}
                                                >
                                                    {body}
                                                </Link>
                                            );
                                        })()}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        {log.user_uuid ? (
                                            <Link
                                                to={`/users/${log.user_uuid}`}
                                                className="rounded px-1 -mx-1 text-foreground hover:bg-muted/70 hover:text-primary underline-offset-2 hover:underline transition-colors"
                                            >
                                                <HighlightMatch text={log.user ?? "System"} query={searchInput} />
                                            </Link>
                                        ) : (
                                            <span className="text-foreground">
                                                <HighlightMatch text={log.user ?? "System"} query={searchInput} />
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap text-foreground">
                                        <span
                                            className={cn(
                                                "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border-0",
                                                actionBadgeClass(log.action),
                                            )}
                                        >
                                            {log.action}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => onSelectLog(log)}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors cursor-pointer"
                                            title="View Details"
                                        >
                                            <span>View</span>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {!isLoading && data.length > 0 && (
                <PaginationControls
                    meta={{
                        mode: "page",
                        perPage,
                        hasPrevious: currentPage > 1,
                        hasNext: currentPage < lastPage,
                        total,
                        page: currentPage,
                        pageCount: lastPage,
                        nextCursor: null,
                        previousCursor: null,
                    }}
                    onFirst={() => onPageChange(1)}
                    onPrev={() => onPageChange(Math.max(1, currentPage - 1))}
                    onNext={() => onPageChange(Math.min(lastPage, currentPage + 1))}
                    onLast={() => onPageChange(lastPage)}
                    onPage={onPageChange}
                    perPage={perPage}
                    onPerPageChange={onPerPageChange}
                    unit="logs"
                />
            )}
        </div>
    );
}

interface UrlLogTableProps {
    id?: string;
    url: string;
    params?: Record<string, string>;
    emptyMessage: string;
    onSelectLog: (log: ActivityLogData) => void;
    availableUsers?: string[];
}

function UrlLogTable({
    id,
    url,
    params,
    emptyMessage,
    onSelectLog,
    availableUsers,
}: UrlLogTableProps) {
    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState("all");
    const [userFilter, setUserFilter] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [sortField, setSortField] = useState<SortableKey>("created_at");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const fixedParams = {
        ...params,
        search: search || undefined,
        action: actionFilter !== "all" ? actionFilter : undefined,
        user: userFilter !== "all" ? userFilter : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        sort_field: sortField,
        sort_dir: sortDir,
    };

    const { data, isLoading, meta, setParams, goToPage } = usePaginatedTable<ActivityLogData>(
        url,
        fixedParams,
        { id },
    );

    const resetPage = () => setParams({ page: null, cursor: null, previous_cursor: null });

    const handleSort = (key: SortableKey) => {
        if (sortField === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(key);
            setSortDir("asc");
        }
    };

    return (
        <LogTableBody
            data={data}
            total={meta.total ?? 0}
            currentPage={meta.page}
            perPage={meta.perPage}
            lastPage={meta.pageCount ?? 1}
            isLoading={isLoading}
            emptyMessage={emptyMessage}
            search={search}
            onSearchChange={(v) => {
                setSearch(v);
                resetPage();
            }}
            actionFilter={actionFilter}
            onActionFilterChange={(v) => {
                setActionFilter(v);
                resetPage();
            }}
            userFilter={userFilter}
            onUserFilterChange={(v) => {
                setUserFilter(v);
                resetPage();
            }}
            startDate={startDate}
            onStartDateChange={(v) => {
                setStartDate(v);
                resetPage();
            }}
            endDate={endDate}
            onEndDateChange={(v) => {
                setEndDate(v);
                resetPage();
            }}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
            onPageChange={goToPage}
            onPerPageChange={(s) =>
                setParams({
                    per_page: String(s),
                    page: null,
                    cursor: null,
                    previous_cursor: null,
                })
            }
            onSelectLog={onSelectLog}
            availableUsers={availableUsers}
        />
    );
}

export function LogTable(props: LogTableProps | UrlLogTableProps) {
    if ("url" in props && props.url) {
        return <UrlLogTable {...(props as UrlLogTableProps)} />;
    }
    return <LogTableBody {...(props as LogTableProps)} />;
}

