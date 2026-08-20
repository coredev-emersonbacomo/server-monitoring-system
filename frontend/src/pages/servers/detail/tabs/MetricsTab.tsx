import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
    Cpu,
    Link2,
    RefreshCw,
    Filter,
    Check,
    Search,
    ArrowUp,
    ArrowDown,
    ArrowUpDown,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ServerStatChart } from "@/pages/dashboard/components/ServerStatChart";
import { cn } from "@/lib/utils";
import { useServerDetailContext } from "../context/ServerDetailContext";
import { CHARTS } from "../constants/charts";
import { toast } from "sonner";
import type { TimeSpan, TimeSpanArgs } from "../types";

type ProcessSortField = "pid" | "name" | "cpu" | "memory" | "reported";
type PortSortField =
    | "port"
    | "protocol"
    | "process"
    | "state"
    | "ping"
    | "reported";

const PAGE_SIZE = 10;

function PaginationControls({
    page,
    pageCount,
    onPage,
    total,
}: {
    page: number;
    pageCount: number;
    onPage: (page: number) => void;
    total: number;
}) {
    const [draft, setDraft] = useState(String(page));
    useEffect(() => setDraft(String(page)), [page]);
    const commit = () => {
        const n = Number.parseInt(draft, 10);
        if (Number.isFinite(n)) {
            onPage(Math.min(Math.max(n, 1), pageCount));
        } else {
            setDraft(String(page));
        }
    };
    if (pageCount <= 1) return null;
    const start = (page - 1) * PAGE_SIZE + 1;
    const end = Math.min(page * PAGE_SIZE, total);
    return (
        <div className="flex items-center justify-between pt-3 text-xs text-muted-foreground">
            <span>
                Showing {start}–{end} of {total}
            </span>
            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    label="Prev"
                    disabled={page <= 1}
                    onClick={() => onPage(page - 1)}
                />
                <span className="flex items-center gap-1">
                    <input
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onBlur={commit}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") commit();
                        }}
                        aria-label="Page"
                        className="w-9 h-6 rounded border border-border bg-background text-center text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    <span>/ {pageCount}</span>
                </span>
                <Button
                    variant="outline"
                    size="sm"
                    label="Next"
                    disabled={page >= pageCount}
                    onClick={() => onPage(page + 1)}
                />
            </div>
        </div>
    );
}

function formatRelativeTime(timestamp?: string | null): string {
    if (!timestamp) return "-";
    const time = new Date(timestamp).getTime();
    if (Number.isNaN(time)) return "-";
    const diff = Date.now() - time;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

function SortableTh<T extends string>({
    label,
    field,
    sortField,
    sortDir,
    onSort,
    right,
}: {
    label: string;
    field: T;
    sortField: T;
    sortDir: "asc" | "desc";
    onSort: (field: T) => void;
    right?: boolean;
}) {
    const isActive = sortField === field;
    return (
        <th
            onClick={() => onSort(field)}
            className={cn(
                "pb-2 font-medium cursor-pointer select-none group",
                right && "text-right",
            )}
        >
            <span
                className={cn(
                    "flex items-center gap-1 transition-colors",
                    right && "flex-row-reverse justify-start",
                    isActive
                        ? "text-foreground"
                        : "text-muted-foreground group-hover:text-foreground",
                )}
            >
                {label}
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
}

function SearchBox({
    value,
    onChange,
    placeholder,
    className,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    className?: string;
}) {
    return (
        <div className={cn("flex items-center", className)}>
            <div className="relative">
                <Search
                    size={13}
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="bg-background border border-border rounded-md pl-7 pr-2 h-9 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 w-44"
                />
            </div>
        </div>
    );
}

// SecOps spotlight: which ports and processes matter for THIS server. null
// (all checked) means "report everything the agent's noise filter allows";
// an array is the exact set to report. Applied by the agent (what it sends)
// and by the backend ping job (what it probes).
function MonitoringFilter({
    uuid,
    kind,
}: {
    uuid: string;
    kind: "ports" | "processes";
}) {
    const { server } = useServerDetailContext();
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [sel, setSel] = useState<Set<number | string> | null>(null);

    const isPorts = kind === "ports";

    const options = useMemo(() => {
        if (isPorts) {
            const byPort = new Map<
                number,
                { protocols: Set<string>; procs: Set<string> }
            >();
            for (const p of server?.available_ports ?? server?.ports ?? []) {
                const e = byPort.get(p.port) ?? {
                    protocols: new Set<string>(),
                    procs: new Set<string>(),
                };
                if (p.protocol) e.protocols.add(p.protocol);
                if (p.process) e.procs.add(p.process);
                byPort.set(p.port, e);
            }
            return [...byPort.entries()]
                .map(([port, { protocols, procs }]) => ({
                    key: port,
                    label: String(port),
                    descriptor: [
                        [...protocols].map((x) => x.toUpperCase()).join("/"),
                        procs.size ? [...procs].join(", ") : "unknown",
                    ]
                        .filter(Boolean)
                        .join(" · "),
                }))
                .sort((a, b) => Number(a.key) - Number(b.key));
        }
        const byName = new Map<string, number>();
        for (const p of server?.available_processes ??
            server?.processes ??
            []) {
            if (!p.name) continue;
            const prev = byName.get(p.name);
            byName.set(
                p.name,
                prev === undefined
                    ? (p.pids?.[0] ?? p.pid)
                    : Math.min(prev, p.pids?.[0] ?? p.pid),
            );
        }
        return [...byName.entries()]
            .map(([name, pid]) => ({
                key: name,
                label: name,
                descriptor: `pid ${pid}`,
            }))
            .sort((a, b) => String(a.key).localeCompare(String(b.key)));
    }, [
        server?.available_ports,
        server?.ports,
        server?.available_processes,
        server?.processes,
        isPorts,
    ]);

    const stored = isPorts ? server?.port_filter : server?.process_filter;
    const allChecked = sel === null;

    // Re-sync from the persisted filter every time the modal opens, so a
    // discarded edit never lingers.
    useEffect(() => {
        if (!open) return;
        setSel(stored ? new Set(stored) : null);
    }, [open, stored]);

    const visibleOptions = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return options;
        return options.filter(
            (o) =>
                String(o.label).toLowerCase().includes(q) ||
                o.descriptor.toLowerCase().includes(q),
        );
    }, [options, search]);

    const toggle = (key: number | string) =>
        setSel((prev) => {
            const base = prev ?? new Set(options.map((o) => o.key));
            const next = new Set(base);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next.size === options.length ? null : next;
        });
    const toggleAll = () =>
        setSel((prev) => (prev === null ? new Set() : null));

    const same = (
        s: Set<number | string> | null,
        storedArr: (number | string)[] | null | undefined,
    ) => {
        if (s === null) return storedArr == null;
        if (storedArr == null) return false;
        return s.size === storedArr.length && storedArr.every((v) => s.has(v));
    };
    const dirty = !same(sel, stored);

    const save = async () => {
        if (!server?.client_uuid) return;
        setSaving(true);
        try {
            const body = isPorts
                ? {
                      port_filter:
                          sel === null
                              ? null
                              : [...sel].map(Number).sort((a, b) => a - b),
                  }
                : {
                      process_filter: sel === null ? null : [...sel].sort(),
                  };
            const { error } = await api.PATCH(
                "/v1/clients/{clientUuid}/servers/{serverUuid}/monitoring",
                {
                    params: {
                        path: {
                            clientUuid: server.client_uuid,
                            serverUuid: uuid,
                        },
                    },
                    body,
                },
            );
            if (error) {
                toast.error("Failed to save monitoring filter.");
            } else {
                toast.success("Monitoring filter saved.");
                setOpen(false);
                queryClient.invalidateQueries({ queryKey: ["server", uuid] });
            }
        } catch {
            toast.error("An error occurred.");
        } finally {
            setSaving(false);
        }
    };

    const noun = isPorts ? "ports" : "processes";
    const Noun = isPorts ? "Ports" : "Processes";

    return (
        <>
            <Button
                variant="outline"
                size="icon"
                icon={<Filter size={14} />}
                aria-label={`Edit ${noun} filter`}
                onClick={() => setOpen(true)}
            />
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Filter size={16} className="text-primary" /> {Noun}{" "}
                            Monitoring Filter
                        </DialogTitle>
                        <DialogDescription>
                            Only the {noun} you leave checked are reported for
                            this server and pinged. Everything checked means the
                            agent's noise filter decides.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="max-h-[60vh] overflow-y-auto pr-1">
                        <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                                <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={allChecked}
                                        onChange={toggleAll}
                                        className="accent-primary cursor-pointer"
                                    />
                                    {Noun} (
                                    {allChecked
                                        ? "all"
                                        : `${sel?.size ?? 0} of ${options.length}`}
                                    )
                                </label>
                                {options.length > 0 && (
                                    <SearchBox
                                        value={search}
                                        onChange={setSearch}
                                        placeholder={`Search ${noun}...`}
                                        className="ml-auto"
                                    />
                                )}
                            </div>
                            {options.length > 0 ? (
                                <div className="grid grid-cols-1 gap-1.5">
                                    {visibleOptions.map((o) => {
                                        const on =
                                            sel?.has(o.key) ?? allChecked;
                                        return (
                                            <button
                                                key={o.key}
                                                onClick={() => toggle(o.key)}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-2 rounded-md border text-left text-xs transition-colors cursor-pointer",
                                                    on
                                                        ? "bg-primary/15 border-primary/30 text-foreground"
                                                        : "bg-muted/30 border-border/40 text-muted-foreground hover:text-foreground",
                                                )}
                                            >
                                                <span
                                                    className={cn(
                                                        "size-4 rounded border flex items-center justify-center shrink-0",
                                                        on
                                                            ? "bg-primary border-primary text-primary-foreground"
                                                            : "bg-background border-border",
                                                    )}
                                                >
                                                    {on && <Check size={11} />}
                                                </span>
                                                <span className="font-semibold text-sm truncate">
                                                    {o.label}
                                                </span>
                                                <span className="truncate">
                                                    {o.descriptor}
                                                </span>
                                            </button>
                                        );
                                    })}
                                    {visibleOptions.length === 0 && (
                                        <p className="text-xs text-muted-foreground col-span-1">
                                            No {noun} match your search.
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    No {noun} reported yet.
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <div className="flex w-full items-center justify-between gap-2 pt-4">
                            <Button
                                variant="ghost"
                                size="sm"
                                label="Reset to all"
                                onClick={() => setSel(null)}
                            />
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    label="Cancel"
                                    onClick={() => setOpen(false)}
                                />
                                <Button
                                    size="sm"
                                    label={saving ? "Saving..." : "Save"}
                                    disabled={!dirty || saving}
                                    onClick={save}
                                />
                            </div>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

export function MetricsTab({
    timeSpan,
    setTimeSpan,
    timeSpanArgs,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    customUnitStr,
    setCustomUnitStr,
    uuid,
}: {
    timeSpan: TimeSpan;
    setTimeSpan: (value: TimeSpan) => void;
    timeSpanArgs: TimeSpanArgs | undefined;
    customFrom: string;
    setCustomFrom: (value: string) => void;
    customTo: string;
    setCustomTo: (value: string) => void;
    customUnitStr: string;
    setCustomUnitStr: (value: string) => void;
    uuid: string;
}) {
    const { server } = useServerDetailContext();
    const queryClient = useQueryClient();

    const [processSearch, setProcessSearch] = useState("");
    const [portSearch, setPortSearch] = useState("");
    const [sortField, setSortField] = useState<ProcessSortField>("cpu");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [portSortField, setPortSortField] = useState<PortSortField>("port");
    const [portSortDir, setPortSortDir] = useState<"asc" | "desc">("asc");
    const [processPage, setProcessPage] = useState(1);
    const [portPage, setPortPage] = useState(1);

    const processRowRef = useRef<HTMLTableRowElement>(null);
    const processHeadRef = useRef<HTMLTableRowElement>(null);
    const portRowRef = useRef<HTMLTableRowElement>(null);
    const portHeadRef = useRef<HTMLTableRowElement>(null);
    const [rowH, setRowH] = useState({
        head: 0,
        row: 0,
        portHead: 0,
        portRow: 0,
    });

    useEffect(() => {
        setProcessPage(1);
    }, [
        server?.processes,
        server?.process_filter,
        processSearch,
        sortField,
        sortDir,
    ]);
    useEffect(() => {
        setPortPage(1);
    }, [
        server?.ports,
        server?.port_filter,
        portSearch,
        portSortField,
        portSortDir,
    ]);

    const handleSort = (field: ProcessSortField) => {
        if (field === sortField) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(field);
            setSortDir(field === "cpu" ? "desc" : "asc");
        }
    };

    const handlePortSort = (field: PortSortField) => {
        if (field === portSortField) {
            setPortSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setPortSortField(field);
            setPortSortDir("asc");
        }
    };

    const sortedProcesses = useMemo(() => {
        const q = processSearch.trim().toLowerCase();
        const pf = server?.process_filter;
        const list = (server?.processes ?? []).filter(
            (p) =>
                (!pf || pf.includes(p.name)) &&
                (!q || p.name.toLowerCase().includes(q)),
        );
        const dir = sortDir === "asc" ? 1 : -1;
        return [...list].sort((a, b) => {
            switch (sortField) {
                case "pid":
                    return (a.pid - b.pid) * dir;
                case "name":
                    return a.name.localeCompare(b.name) * dir;
                case "cpu":
                    return ((a.cpu ?? -1) - (b.cpu ?? -1)) * dir;
                case "memory":
                    return ((a.memory ?? -1) - (b.memory ?? -1)) * dir;
                case "reported":
                    return (
                        (new Date(b.last_seen ?? 0).getTime() -
                            new Date(a.last_seen ?? 0).getTime()) *
                        dir
                    );
            }
        });
    }, [
        server?.processes,
        server?.process_filter,
        processSearch,
        sortField,
        sortDir,
    ]);

    const filteredPorts = useMemo(() => {
        const q = portSearch.trim().toLowerCase();
        const ptf = server?.port_filter;
        const base = (server?.ports ?? []).filter(
            (p) => !ptf || ptf.includes(p.port),
        );
        if (!q) return base;
        return base.filter(
            (p) =>
                String(p.port).includes(q) ||
                (p.process ?? "").toLowerCase().includes(q),
        );
    }, [server?.ports, server?.port_filter, portSearch]);

    const sortedPorts = useMemo(() => {
        const dir = portSortDir === "asc" ? 1 : -1;
        return [...filteredPorts].sort((a, b) => {
            switch (portSortField) {
                case "port":
                    return (a.port - b.port) * dir;
                case "protocol":
                    return (
                        (a.protocol ?? "").localeCompare(b.protocol ?? "") * dir
                    );
                case "process":
                    return (
                        (a.process ?? "").localeCompare(b.process ?? "") * dir
                    );
                case "state":
                    return (a.state ?? "").localeCompare(b.state ?? "") * dir;
                case "ping":
                    return ((a.ping_time ?? -1) - (b.ping_time ?? -1)) * dir;
                case "reported":
                    return (
                        (new Date(b.last_seen ?? 0).getTime() -
                            new Date(a.last_seen ?? 0).getTime()) *
                        dir
                    );
            }
        });
    }, [filteredPorts, portSortField, portSortDir]);

    const processPageCount = Math.max(
        1,
        Math.ceil(sortedProcesses.length / PAGE_SIZE),
    );
    const portPageCount = Math.max(
        1,
        Math.ceil(filteredPorts.length / PAGE_SIZE),
    );
    const visibleProcesses = sortedProcesses.slice(
        (processPage - 1) * PAGE_SIZE,
        processPage * PAGE_SIZE,
    );
    const visiblePorts = sortedPorts.slice(
        (portPage - 1) * PAGE_SIZE,
        portPage * PAGE_SIZE,
    );

    useLayoutEffect(() => {
        setRowH({
            head: processHeadRef.current?.getBoundingClientRect().height ?? 0,
            row: processRowRef.current?.getBoundingClientRect().height ?? 0,
            portHead: portHeadRef.current?.getBoundingClientRect().height ?? 0,
            portRow: portRowRef.current?.getBoundingClientRect().height ?? 0,
        });
    }, [processPage, portPage, sortedProcesses.length, filteredPorts.length]);

    return (
        <div className="flex flex-col gap-6 p-4 bg-card border border-t-0 border-border/60 rounded-b-lg">
            <div className="border-b border-border/60 pb-4">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-foreground">
                        System Resources
                    </h3>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            icon={<RefreshCw size={13} />}
                            label="Refresh"
                            onClick={() =>
                                queryClient.invalidateQueries({
                                    queryKey: ["server", uuid],
                                })
                            }
                        />
                        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border border-border/50">
                            {(
                                [
                                    "1H",
                                    "1D",
                                    "1W",
                                    "1M",
                                    "3M",
                                    "6M",
                                ] as TimeSpan[]
                            ).map((span) => (
                                <button
                                    key={span}
                                    onClick={() => setTimeSpan(span)}
                                    className={cn(
                                        "px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer",
                                        timeSpan === span
                                            ? "bg-background text-foreground shadow-sm border border-border"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                    )}
                                >
                                    {span}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border border-border/50">
                            {(
                                [
                                    "1Y",
                                    "3Y",
                                    "6Y",
                                    "9Y",
                                    "12Y",
                                    "Custom",
                                ] as TimeSpan[]
                            ).map((span) => (
                                <button
                                    key={span}
                                    onClick={() => setTimeSpan(span)}
                                    className={cn(
                                        "px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer",
                                        timeSpan === span
                                            ? "bg-background text-foreground shadow-sm border border-border"
                                            : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                                    )}
                                >
                                    {span}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {timeSpan === "Custom" && (
                    <div className="flex flex-wrap items-center gap-4 mb-6 bg-muted/20 p-3 rounded-lg border border-border/50">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground font-medium">
                                From:
                            </label>
                            <input
                                type="datetime-local"
                                value={customFrom}
                                onChange={(e) => setCustomFrom(e.target.value)}
                                className="bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 dark:[&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground font-medium">
                                Until:
                            </label>
                            <input
                                type="datetime-local"
                                value={customTo}
                                onChange={(e) => setCustomTo(e.target.value)}
                                className="bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 dark:[&::-webkit-calendar-picker-indicator]:invert"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground font-medium">
                                Unit:
                            </label>
                            <select
                                value={customUnitStr}
                                onChange={(e) =>
                                    setCustomUnitStr(e.target.value)
                                }
                                className="bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                            >
                                <option value="auto">Auto</option>
                                <option
                                    value="1"
                                    disabled={(timeSpanArgs?.minUnit ?? 1) > 1}
                                >
                                    Minute
                                </option>
                                <option
                                    value="2"
                                    disabled={(timeSpanArgs?.minUnit ?? 1) > 2}
                                >
                                    Hour
                                </option>
                                <option
                                    value="3"
                                    disabled={(timeSpanArgs?.minUnit ?? 1) > 3}
                                >
                                    Day
                                </option>
                                <option
                                    value="4"
                                    disabled={(timeSpanArgs?.minUnit ?? 1) > 4}
                                >
                                    Week
                                </option>
                                <option
                                    value="5"
                                    disabled={(timeSpanArgs?.minUnit ?? 1) > 5}
                                >
                                    Month
                                </option>
                            </select>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-1 gap-6">
                    {CHARTS.map((cfg) => (
                        <ServerStatChart
                            key={cfg.dataKey}
                            title={cfg.title}
                            data={server?.stats || []}
                            dataKey={cfg.dataKey}
                            color={cfg.color}
                            unit={cfg.unit}
                            yDomain={cfg.yDomain}
                            timeSpan={timeSpan}
                        />
                    ))}
                </div>
            </div>
            <div className="flex flex-col gap-6">
                <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Cpu size={16} className="text-primary" /> Processes
                        </h3>
                        <div className="flex items-stretch gap-2">
                            <MonitoringFilter uuid={uuid} kind="processes" />
                            <SearchBox
                                value={processSearch}
                                onChange={setProcessSearch}
                                placeholder="Search processes..."
                                className="flex-1"
                            />
                        </div>
                    </div>
                    {sortedProcesses.length > 0 ? (
                        <div
                            className="overflow-x-auto"
                            style={{
                                minHeight:
                                    rowH.head +
                                    rowH.row *
                                        (sortedProcesses.length > PAGE_SIZE
                                            ? PAGE_SIZE
                                            : sortedProcesses.length %
                                                  PAGE_SIZE ||
                                              sortedProcesses.length),
                            }}
                        >
                            <table className="w-full text-left text-xs table-fixed">
                                <thead>
                                    <tr
                                        ref={processHeadRef}
                                        className="text-muted-foreground border-b border-border/30"
                                    >
                                        <SortableTh
                                            label="PID(s)"
                                            field="pid"
                                            sortField={sortField}
                                            sortDir={sortDir}
                                            onSort={handleSort}
                                        />
                                        <SortableTh
                                            label="Name"
                                            field="name"
                                            sortField={sortField}
                                            sortDir={sortDir}
                                            onSort={handleSort}
                                        />
                                        <SortableTh
                                            label="CPU"
                                            field="cpu"
                                            sortField={sortField}
                                            sortDir={sortDir}
                                            onSort={handleSort}
                                            right
                                        />
                                        <SortableTh
                                            label="RAM"
                                            field="memory"
                                            sortField={sortField}
                                            sortDir={sortDir}
                                            onSort={handleSort}
                                            right
                                        />
                                        <SortableTh
                                            label="Reported"
                                            field="reported"
                                            sortField={sortField}
                                            sortDir={sortDir}
                                            onSort={handleSort}
                                            right
                                        />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {visibleProcesses.map((p, i) => (
                                        <tr
                                            key={p.name}
                                            ref={
                                                i === 0
                                                    ? processRowRef
                                                    : undefined
                                            }
                                            className="hover:bg-muted/10"
                                        >
                                            <td
                                                className="py-2 text-muted-foreground truncate pr-10"
                                                title={(p.pids ?? [p.pid]).join(
                                                    ", ",
                                                )}
                                            >
                                                {(p.pids ?? [p.pid]).join(", ")}
                                            </td>
                                            <td
                                                className="py-2 font-medium text-foreground truncate"
                                                title={p.name}
                                            >
                                                {p.name}
                                                {(p.pids?.length ?? 1) > 1 ? (
                                                    <span className="text-muted-foreground">
                                                        {" "}
                                                        ({p.pids!.length})
                                                    </span>
                                                ) : null}
                                            </td>
                                            <td className="py-2 text-right text-foreground">
                                                {p.cpu != null
                                                    ? `${p.cpu.toFixed(1)}%`
                                                    : "-"}
                                            </td>
                                            <td className="py-2 text-right text-foreground">
                                                {p.memory != null
                                                    ? `${p.memory.toFixed(1)} MB`
                                                    : "-"}
                                            </td>
                                            <td
                                                className="py-2 text-right text-muted-foreground"
                                                title={p.last_seen ?? undefined}
                                            >
                                                {formatRelativeTime(
                                                    p.last_seen,
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground py-4 text-center">
                            {server?.processes?.length
                                ? "No processes match your search."
                                : "No processes reported."}
                        </p>
                    )}
                    <PaginationControls
                        page={processPage}
                        pageCount={processPageCount}
                        onPage={setProcessPage}
                        total={sortedProcesses.length}
                    />
                </div>

                <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <Link2 size={16} className="text-primary" /> Exposed
                            Ports
                        </h3>
                        <div className="flex items-stretch gap-2">
                            <MonitoringFilter uuid={uuid} kind="ports" />
                            <SearchBox
                                value={portSearch}
                                onChange={setPortSearch}
                                placeholder="Search ports..."
                                className="flex-1"
                            />
                        </div>
                    </div>
                    {filteredPorts.length > 0 ? (
                        <div
                            className="overflow-x-auto"
                            style={{
                                minHeight:
                                    rowH.portHead +
                                    rowH.portRow *
                                        (filteredPorts.length > PAGE_SIZE
                                            ? PAGE_SIZE
                                            : filteredPorts.length %
                                                  PAGE_SIZE ||
                                              filteredPorts.length),
                            }}
                        >
                            <table className="w-full text-left text-xs table-fixed">
                                <thead>
                                    <tr
                                        ref={portHeadRef}
                                        className="text-muted-foreground border-b border-border/30"
                                    >
                                        <SortableTh
                                            label="Port"
                                            field="port"
                                            sortField={portSortField}
                                            sortDir={portSortDir}
                                            onSort={handlePortSort}
                                        />
                                        <SortableTh
                                            label="Proto"
                                            field="protocol"
                                            sortField={portSortField}
                                            sortDir={portSortDir}
                                            onSort={handlePortSort}
                                        />
                                        <SortableTh
                                            label="Process"
                                            field="process"
                                            sortField={portSortField}
                                            sortDir={portSortDir}
                                            onSort={handlePortSort}
                                        />
                                        <SortableTh
                                            label="State"
                                            field="state"
                                            sortField={portSortField}
                                            sortDir={portSortDir}
                                            onSort={handlePortSort}
                                            right
                                        />
                                        <SortableTh
                                            label="Ping"
                                            field="ping"
                                            sortField={portSortField}
                                            sortDir={portSortDir}
                                            onSort={handlePortSort}
                                            right
                                        />
                                        <SortableTh
                                            label="Reported"
                                            field="reported"
                                            sortField={portSortField}
                                            sortDir={portSortDir}
                                            onSort={handlePortSort}
                                            right
                                        />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {visiblePorts.map((p, i) => (
                                        <tr
                                            key={i}
                                            ref={
                                                i === 0 ? portRowRef : undefined
                                            }
                                            className="hover:bg-muted/10"
                                        >
                                            <td className="py-2 font-semibold text-foreground">
                                                {p.port}
                                            </td>
                                            <td className="py-2 text-muted-foreground uppercase">
                                                {p.protocol}
                                            </td>
                                            <td className="py-2 text-foreground font-medium truncate">
                                                {p.process || "unknown"}
                                            </td>
                                            <td className="py-2 text-right flex items-center justify-end gap-1.5">
                                                <span
                                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${p.state === "listening" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"}`}
                                                >
                                                    {p.state}
                                                </span>
                                            </td>
                                            <td className="py-2 text-right text-foreground">
                                                {p.ping_status === "offline"
                                                    ? "unreachable"
                                                    : p.ping_status === "online"
                                                      ? `${p.ping_time}ms`
                                                      : "-"}
                                            </td>
                                            <td
                                                className="py-2 text-right text-muted-foreground"
                                                title={p.last_seen ?? undefined}
                                            >
                                                {formatRelativeTime(
                                                    p.last_seen,
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground py-4 text-center">
                            {server?.ports?.length
                                ? "No ports match your search."
                                : "No open exposed ports."}
                        </p>
                    )}
                    <PaginationControls
                        page={portPage}
                        pageCount={portPageCount}
                        onPage={setPortPage}
                        total={filteredPorts.length}
                    />
                </div>
            </div>

        </div>
    );
}
