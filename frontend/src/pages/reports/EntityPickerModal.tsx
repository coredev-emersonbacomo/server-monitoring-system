import { useState, useMemo } from "react";
import { useClients } from "@/hooks/useClients";
import { useServers } from "@/hooks/useServers";
import {
    Filter,
    ArrowUpDown,
    Landmark,
    X,
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    resolveServerStatusKey,
    STATUS_CONFIG,
} from "@/constants/serverStatus";

type EntityType = "clients" | "servers";

export interface EntityItemData {
    uuid: string;
    name: string;
    status?: string | null;
    record_status?: string | null;
    agent_deleted?: boolean | null;
    client_uuid?: string | null;
    client_name?: string | null;
    created_at?: string | null;
    [key: string]: unknown;
}

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

    const clientsQuery = useClients(
        type === "clients" ? queryParams : undefined,
    );
    const serversQuery = useServers();

    const activeQuery = type === "clients" ? clientsQuery : serversQuery;
    const { data: rawItems = [], isLoading, error } = activeQuery;
    const items = rawItems as unknown as EntityItemData[];

    const statusCounts = useMemo(() => {
        const counts: Record<string, number> = { all: items.length };
        items.forEach((item: EntityItemData) => {
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
        let result = items.filter((item: EntityItemData) =>
            item.name?.toLowerCase().includes(search.toLowerCase()),
        );

        if (type === "servers" && statusFilter !== "all") {
            result = result.filter((item: EntityItemData) => {
                const key = resolveServerStatusKey(
                    item.status,
                    item.record_status,
                    item.agent_deleted,
                );
                if (statusFilter === "active")
                    return key !== "pending_installation";
                return key === statusFilter;
            });
        } else if (type === "clients" && statusFilter !== "all") {
            result = result.filter((item: EntityItemData) => {
                return (item.record_status || "active") === statusFilter;
            });
        }

        result.sort((a: EntityItemData, b: EntityItemData) => {
            const aVal = String(a[sortField] ?? "");
            const bVal = String(b[sortField] ?? "");
            const cmp = aVal.localeCompare(bVal);
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
            setSelected(new Set(filtered.map((item: EntityItemData) => item.uuid)));
        }
    };

    const handleGenerate = () => {
        if (selected.size === 0) return;
        onSelect(Array.from(selected));
    };

    const groupedByClient = useMemo(() => {
        if (!viewByClient || type !== "servers") return null;
        const groups: Record<string, { name: string; items: EntityItemData[] }> = {};
        filtered.forEach((item: EntityItemData) => {
            const key = item.client_uuid || "unassigned";
            if (!groups[key]) {
                groups[key] = {
                    name: item.client_name || "Unassigned",
                    items: [],
                };
            }
            groups[key].items.push(item);
        });
        return groups;
    }, [viewByClient, filtered, type]);

    const filterOptions =
        type === "servers"
            ? (
                  [
                      "active",
                      "all",
                      "online",
                      "offline",
                      "waiting_for_installation",
                      "pending_deletion",
                      "archived",
                  ] as const
              ).map((key) => ({
                  label:
                      key === "active"
                          ? "Active"
                          : key === "all"
                            ? "All"
                            : (STATUS_CONFIG[key]?.label ?? key),
                  value: key,
                  count:
                      key === "active"
                          ? items.filter((item: EntityItemData) => {
                                const k = resolveServerStatusKey(
                                    item.status,
                                    item.record_status,
                                    item.agent_deleted,
                                );
                                return k !== "pending_installation";
                            }).length
                          : key === "all"
                            ? items.length
                            : statusCounts[key] || 0,
              }))
            : CLIENT_FILTER_OPTIONS.map((opt) => ({
                  label: opt.label,
                  value: opt.value,
                  count:
                      opt.value === "all"
                          ? items.length
                          : items.filter(
                                (item: EntityItemData) =>
                                    (item.record_status || "active") ===
                                    opt.value,
                            ).length,
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
                    <h2 className="text-base font-semibold text-foreground">
                        Select {type === "clients" ? "Clients" : "Servers"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="flex items-center gap-2 mb-3">
                    <input
                        type="text"
                        placeholder={`Search ${type}…`}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm rounded-lg bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />

                    <Popover>
                        <PopoverTrigger asChild>
                            <button
                                type="button"
                                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                            >
                                <Filter size={15} />
                                <span>Filter</span>
                            </button>
                        </PopoverTrigger>
                        <PopoverContent
                            align="end"
                            className="w-56 p-2 bg-card border border-border shadow-md rounded-lg"
                        >
                            <div className="space-y-1">
                                <p className="text-[11px] font-semibold text-muted-foreground uppercase px-2 py-1">
                                    Status
                                </p>
                                {filterOptions.map((option) => (
                                    <label
                                        key={option.value}
                                        className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-sidebar-hover text-xs cursor-pointer"
                                    >
                                        <span className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="status-filter"
                                                value={option.value}
                                                checked={
                                                    statusFilter ===
                                                    option.value
                                                }
                                                onChange={() =>
                                                    setStatusFilter(
                                                        option.value,
                                                    )
                                                }
                                                className="h-3.5 w-3.5 accent-black cursor-pointer bg-background border-foreground"
                                            />
                                            {option.label}
                                        </span>
                                        <span className="text-muted-foreground">
                                            {option.count}
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <div className="border-t border-border my-2" />

                            <div className="space-y-1">
                                <div className="flex items-center justify-between px-2 py-1">
                                    <span className="text-[11px] font-semibold text-muted-foreground uppercase">
                                        Sort By
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setSortDir(
                                                sortDir === "desc" ? "asc" : "desc",
                                            )
                                        }
                                        className="flex items-center gap-1 text-xs cursor-pointer font-medium rounded-md px-1.5 py-0.5 transition-colors text-primary"
                                    >
                                        <ArrowUpDown size={12} />
                                        <span>
                                            {sortDir === "asc"
                                                ? "Asc"
                                                : "Desc"}
                                        </span>
                                    </button>
                                </div>
                                {SORT_FIELDS.map((option) => (
                                    <label
                                        key={option.value}
                                        className="flex items-center px-2 py-1.5 rounded-md hover:bg-sidebar-hover text-xs cursor-pointer gap-2"
                                    >
                                        <input
                                            type="radio"
                                            name="sort-field"
                                            value={option.value}
                                            checked={sortField === option.value}
                                            onChange={() =>
                                                setSortField(option.value)
                                            }
                                            className="h-3.5 w-3.5 accent-black cursor-pointer bg-background border-foreground"
                                        />
                                        {option.label}
                                    </label>
                                ))}
                            </div>

                            {type === "servers" && (
                                <>
                                    <div className="border-t border-border my-2" />
                                    <div className="px-2 py-1">
                                        <label className="flex items-center gap-2 text-xs cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={viewByClient}
                                                onChange={(e) =>
                                                    setViewByClient(
                                                        e.target.checked,
                                                    )
                                                }
                                                className="accent-primary"
                                            />
                                            <Landmark size={13} />
                                            Group by Client
                                        </label>
                                    </div>
                                </>
                            )}
                        </PopoverContent>
                    </Popover>
                </div>

                {filtered.length > 0 && (
                    <button
                        type="button"
                        onClick={toggleAll}
                        className="mb-2 text-xs text-muted-foreground hover:text-foreground w-fit cursor-pointer"
                    >
                        {selected.size === filtered.length
                            ? "Deselect all"
                            : "Select all"}
                    </button>
                )}

                <div className="max-h-64 overflow-y-auto divide-y divide-border border border-border rounded-lg">
                    {isLoading && (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            Loading…
                        </p>
                    )}

                    {error && (
                        <p className="text-sm text-red-400 py-8 text-center">
                            Failed to load {type}.
                        </p>
                    )}

                    {!isLoading && !error && filtered.length === 0 && (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            No {type} found.
                        </p>
                    )}

                    {!isLoading &&
                        !error &&
                        !groupedByClient &&
                        filtered.map((item: EntityItemData) => (
                            <EntityItem
                                key={item.uuid}
                                item={item}
                                type={type}
                                checked={selected.has(item.uuid)}
                                onToggle={() => toggle(item.uuid)}
                            />
                        ))}

                    {!isLoading &&
                        !error &&
                        groupedByClient &&
                        Object.entries(groupedByClient).map(
                            ([clientUuid, group]) => {
                                const groupSelected = group.items.filter(
                                    (item: EntityItemData) => selected.has(item.uuid),
                                ).length;
                                const groupAll = group.items.length;
                                const groupChecked =
                                    groupAll > 0 && groupSelected === groupAll;

                                const toggleGroup = () => {
                                    setSelected((prev) => {
                                        const next = new Set(prev);
                                        if (groupChecked) {
                                            group.items.forEach((item: EntityItemData) =>
                                                next.delete(item.uuid),
                                            );
                                        } else {
                                            group.items.forEach((item: EntityItemData) =>
                                                next.add(item.uuid),
                                            );
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
                                        {group.items.map((item: EntityItemData) => (
                                            <EntityItem
                                                key={item.uuid}
                                                item={item}
                                                type={type}
                                                checked={selected.has(
                                                    item.uuid,
                                                )}
                                                onToggle={() =>
                                                    toggle(item.uuid)
                                                }
                                            />
                                        ))}
                                    </div>
                                );
                            },
                        )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
                    <span className="text-xs text-muted-foreground">
                        {selected.size} selected
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-3 py-1.5 text-sm rounded-lg border border-border text-foreground hover:bg-sidebar-hover cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleGenerate}
                            disabled={selected.size === 0}
                            className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                        >
                            Confirm Selection
                        </button>
                    </div>
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
    item: EntityItemData;
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
