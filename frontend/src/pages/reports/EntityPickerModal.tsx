import { useState, useMemo } from "react";
import { useClients } from "@/hooks/useClients";
import { useServers } from "@/hooks/useServers";
import {
    Filter,
    ArrowUpDown,
    ArrowDownWideNarrow,
    ArrowUpWideNarrow,
    Landmark,
    X,
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { resolveServerStatusKey, STATUS_CONFIG } from "@/constants/serverStatus";

type EntityType = "clients" | "servers";

interface EntityPickerModalProps {
    type: EntityType;
    onSelect: (uuids: string[]) => void;
    onClose: () => void;
    queryParams?: {
        exclude_user_uuid?: string;
        user_uuid?: string;
        available_only?: boolean;
    };
}

const SORT_FIELDS = [
    { label: "Created At", value: "created_at" },
    { label: "Name", value: "name" },
] as const;

const CLIENT_FILTER_OPTIONS = [
    { label: "All", value: "all" },
    { label: "Active", value: "active" },
    { label: "Inactive", value: "inactive" },
] as const;

export function EntityPickerModal({
    type,
    onSelect,
    onClose,
    queryParams,
}: EntityPickerModalProps) {
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());

    const [statusFilter, setStatusFilter] = useState<string>(
        type === "servers" ? "active" : "all",
    );
    const [sortField, setSortField] = useState<string>("created_at");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [viewByClient, setViewByClient] = useState(false);

    const clientsQuery = useClients(type === "clients" ? queryParams : undefined);
    const serversQuery = useServers();

    const activeQuery = type === "clients" ? clientsQuery : serversQuery;
    const { data: items = [], isLoading, error } = activeQuery;

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { all: items.length };
        items.forEach((item: any) => {
            const key = resolveServerStatusKey(
                item.status,
                item.record_status,
                item.agent_deleted,
            );
            counts[key] = (counts[key] || 0) + 1;
        });
        return counts;
    }, [items]);

    const filtered = useMemo(() => {
        let result = items.filter((item: any) =>
            item.name?.toLowerCase().includes(search.toLowerCase()),
        );

        if (type === "servers" && statusFilter !== "all") {
            result = result.filter((item: any) => {
                const key = resolveServerStatusKey(
                    item.status,
                    item.record_status,
                    item.agent_deleted,
                );
                if (statusFilter === "active") return key !== "pending_installation";
                return key === statusFilter;
            });
        } else if (type === "clients" && statusFilter !== "all") {
            result = result.filter((item: any) => {
                return (item.record_status || "active") === statusFilter;
            });
        }

        result.sort((a: any, b: any) => {
            const aVal = a[sortField] ?? "";
            const bVal = b[sortField] ?? "";
            const cmp = String(aVal).localeCompare(String(bVal));
            return sortDir === "asc" ? cmp : -cmp;
        });

        return result;
    }, [items, search, statusFilter, sortField, sortDir, type]);

    const toggle = (uuid: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(uuid)) {
                next.delete(uuid);
            } else {
                next.add(uuid);
            }
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === filtered.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(filtered.map((item: any) => item.uuid)));
        }
    };

    const handleGenerate = () => {
        if (selected.size === 0) return;
        onSelect(Array.from(selected));
    };

    const groupedByClient = useMemo(() => {
        if (!viewByClient || type !== "servers") return null;
        const groups: Record<string, { name: string; items: any[] }> = {};
        filtered.forEach((item: any) => {
            const key = item.client_uuid || "unassigned";
            if (!groups[key]) {
                groups[key] = { name: item.client_name || "Unassigned", items: [] };
            }
            groups[key].items.push(item);
        });
        return groups;
    }, [viewByClient, filtered, type]);

    const filterOptions = type === "servers"
        ? (["active", "all", "online", "offline", "waiting_for_installation", "pending_deletion", "archived"] as const).map((key) => ({
              label: key === "active" ? "Active" : key === "all" ? "All" : STATUS_CONFIG[key]?.label ?? key,
              value: key,
              count: key === "active"
                  ? items.filter((item: any) => {
                        const k = resolveServerStatusKey(item.status, item.record_status, item.agent_deleted);
                        return k !== "pending_installation";
                    }).length
                  : key === "all"
                  ? items.length
                  : statusCounts[key] || 0,
          }))
        : CLIENT_FILTER_OPTIONS.map((opt) => ({
              label: opt.label,
              value: opt.value,
              count: opt.value === "all"
                  ? items.length
                  : items.filter((item: any) => (item.record_status || "active") === opt.value).length,
          }));

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={onClose}
        >
            <div
                className="w-full max-w-xl rounded-xl bg-background border border-border shadow-lg p-5"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="font-semibold text-base">
                        Select {type === "servers" ? "Servers" : "Clients"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground text-sm cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex items-center gap-2 mb-3">
                    <input
                        autoFocus
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder={`Search ${type}...`}
                        className="flex-1 px-3 py-2.5 rounded-lg border border-border bg-sidebar-hover text-sm outline-none"
                    />

                    <Popover>
                        <PopoverTrigger asChild>
                            <button className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border text-sm text-foreground hover:bg-muted transition-colors cursor-pointer">
                                <Filter size={14} />
                                <span>Filter</span>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-56 p-2">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                                    Filter
                                </div>
                                <div>
                                    {filterOptions.map((option) => (
                                        <label
                                            key={option.value}
                                            className="flex items-center justify-between w-full px-2 py-1 rounded-md text-sm transition-colors cursor-pointer hover:bg-muted text-foreground"
                                        >
                                            <span className="flex items-center gap-1.5">
                                                <input
                                                    type="radio"
                                                    name="status-filter"
                                                    value={option.value}
                                                    checked={statusFilter === option.value}
                                                    onChange={() => setStatusFilter(option.value)}
                                                    className="h-3.5 w-3.5 accent-black cursor-pointer bg-background border-foreground"
                                                />
                                                {option.label}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {option.count}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="h-px bg-border my-2" />

                            <div className="flex items-center justify-between px-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Sort
                                </span>
                                <button
                                    type="button"
                                    onClick={() => setSortDir(sortDir === "desc" ? "asc" : "desc")}
                                    className="flex items-center gap-1 text-xs cursor-pointer font-medium rounded-md px-1.5 py-0.5 transition-colors text-primary"
                                >
                                    <ArrowUpDown size={12} />
                                    {sortDir === "desc" ? "desc" : "asc"}
                                </button>
                            </div>
                            <div>
                                {SORT_FIELDS.map((option) => (
                                    <label
                                        key={option.value}
                                        className="flex items-center gap-1.5 w-full px-2 py-1 rounded-md text-sm transition-colors cursor-pointer hover:bg-muted text-foreground"
                                    >
                                        <input
                                            type="radio"
                                            name="sort-field"
                                            value={option.value}
                                            checked={sortField === option.value}
                                            onChange={() => setSortField(option.value)}
                                            className="h-3.5 w-3.5 accent-black cursor-pointer bg-background border-foreground"
                                        />
                                        {option.label}
                                    </label>
                                ))}
                            </div>
                        </PopoverContent>
                    </Popover>

                    {type === "servers" && (
                        <button
                            onClick={() => setViewByClient(!viewByClient)}
                            className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-lg border text-sm transition-colors cursor-pointer ${
                                viewByClient
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-border text-foreground hover:bg-muted"
                            }`}
                        >
                            <Landmark size={14} />
                            <span>By Client</span>
                            {viewByClient && (
                                <X
                                    size={12}
                                    className="ml-0.5"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setViewByClient(false);
                                    }}
                                />
                            )}
                        </button>
                    )}
                </div>

                {!isLoading && !error && filtered.length > 0 && (
                    <button
                        onClick={toggleAll}
                        className="mb-2 text-xs text-muted-foreground hover:text-foreground w-fit cursor-pointer"
                    >
                        {selected.size === filtered.length ? "Deselect all" : "Select all"}
                    </button>
                )}

                <div className="max-h-[24rem] overflow-y-auto flex flex-col gap-1">
                    {isLoading && (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            Loading...
                        </p>
                    )}

                    {error && (
                        <p className="text-sm text-destructive py-8 text-center">
                            Failed to load {type}.
                        </p>
                    )}

                    {!isLoading && !error && filtered.length === 0 && (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            No {type} found.
                        </p>
                    )}

                    {!isLoading && !error && !groupedByClient &&
                        filtered.map((item: any) => (
                            <EntityItem
                                key={item.uuid}
                                item={item}
                                type={type}
                                checked={selected.has(item.uuid)}
                                onToggle={() => toggle(item.uuid)}
                            />
                        ))}

                    {!isLoading && !error && groupedByClient &&
                        Object.entries(groupedByClient).map(([clientUuid, group]) => {
                            const groupSelected = group.items.filter((item: any) => selected.has(item.uuid)).length;
                            const groupAll = group.items.length;
                            const groupChecked = groupAll > 0 && groupSelected === groupAll;

                            const toggleGroup = () => {
                                setSelected((prev) => {
                                    const next = new Set(prev);
                                    if (groupChecked) {
                                        group.items.forEach((item: any) => next.delete(item.uuid));
                                    } else {
                                        group.items.forEach((item: any) => next.add(item.uuid));
                                    }
                                    return next;
                                });
                            };

                            return (
                            <div key={clientUuid}>
                                <div className="flex items-center justify-between px-2 py-1.5">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        {group.name}
                                    </span>
                                    <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={groupChecked}
                                            onChange={toggleGroup}
                                            className="accent-primary"
                                        />
                                        Select all
                                    </label>
                                </div>
                                {group.items.map((item: any) => (
                                    <EntityItem
                                        key={item.uuid}
                                        item={item}
                                        type={type}
                                        checked={selected.has(item.uuid)}
                                        onToggle={() => toggle(item.uuid)}
                                    />
                                ))}
                            </div>
                        );
                        })}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                        {selected.size} selected
                    </span>
                    <button
                        onClick={handleGenerate}
                        disabled={selected.size === 0}
                        className="px-4 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                        Generate Report
                    </button>
                </div>
            </div>
        </div>
    );
}

function EntityItem({
    item,
    type,
    checked,
    onToggle,
}: {
    item: any;
    type: EntityType;
    checked: boolean;
    onToggle: () => void;
}) {
    const isActive = (item.record_status || "active") === "active";

    let statusLabel: string;
    let statusColor: string;

    if (type === "clients") {
        statusLabel = isActive ? "Active" : "Inactive";
        statusColor = isActive ? "text-emerald-400" : "text-muted-foreground";
    } else {
        const statusKey = resolveServerStatusKey(
            item.status,
            item.record_status,
            item.agent_deleted,
        );
        const config = STATUS_CONFIG[statusKey];
        statusLabel = config?.label ?? item.status ?? "Unknown";
        statusColor = config?.color ?? "text-muted-foreground";
    }

    return (
        <label className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-sidebar-hover text-sm cursor-pointer">
            <span className="flex items-center gap-3">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={onToggle}
                    className="accent-primary"
                />
                <span className="font-medium">{item.name}</span>
            </span>
            <span className={`flex items-center gap-1 text-xs ${statusColor}`}>
                {statusLabel}
            </span>
        </label>
    );
}
