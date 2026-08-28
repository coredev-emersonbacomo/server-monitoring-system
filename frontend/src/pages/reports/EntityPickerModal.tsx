import { useMemo, useState } from "react";
import { useUrlState } from "@/hooks/useUrlState";
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
import { DebouncedSearchInput } from "@/components/DebouncedSearchInput";
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

export function EntityPickerModal({
    type,
    onSelect,
    onClose,
    queryParams,
}: EntityPickerModalProps) {
    const [s, setS] = useUrlState({
        q: { default: "" },
        status: { default: type === "servers" ? "active" : "all" },
        sort: { default: "created_at" },
        dir: { default: "desc" as "asc" | "desc" },
        group: { default: "0" },
    });

    const [selected, setSelected] = useState<Set<string>>(new Set());

    const serverParams = {
        q: s.q || undefined,
        status: s.status,
        sort: s.sort,
        dir: s.dir,
        per_page: 50,
    };
    const clientParams = {
        q: s.q || undefined,
        sort: s.sort,
        dir: s.dir,
        per_page: 50,
        ...queryParams,
    };

    const clientsQuery = useClients(type === "clients" ? clientParams : undefined);
    const serversQuery = type === "servers" ? useServers(serverParams) : null;

    const isLoading = type === "clients" ? clientsQuery.isLoading : (serversQuery?.isLoading ?? false);
    const error = type === "clients" ? clientsQuery.error : (serversQuery?.error ?? null);
    const items = useMemo<EntityItemData[]>(() => {
        if (type === "clients") {
            return (clientsQuery.data?.data ?? []) as unknown as EntityItemData[];
        }
        return ((serversQuery?.data?.data ?? []) as unknown as EntityItemData[]);
    }, [type, clientsQuery.data, serversQuery?.data]);

    const toggle = (uuid: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(uuid)) next.delete(uuid);
            else next.add(uuid);
            return next;
        });
    };

    const toggleAll = () => {
        if (selected.size === items.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(items.map((item) => item.uuid)));
        }
    };

    const handleGenerate = () => {
        if (selected.size === 0) return;
        onSelect(Array.from(selected));
    };

    const viewByClient = s.group === "1";

    const groupedByClient = useMemo(() => {
        if (!viewByClient || type !== "servers") return null;
        const groups: Record<string, { name: string; items: EntityItemData[] }> = {};
        items.forEach((item) => {
            const key = item.client_uuid || "unassigned";
            if (!groups[key]) {
                groups[key] = { name: item.client_name || "Unassigned", items: [] };
            }
            groups[key].items.push(item);
        });
        return groups;
    }, [viewByClient, items, type]);

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
                    <DebouncedSearchInput
                        paramName={type === "servers" ? "entity_server_q" : "entity_client_q"}
                        debounceMs={300}
                        placeholder={`Search ${type}…`}
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
                                {(type === "servers"
                                    ? ["active", "all", "online", "offline", "waiting_for_installation", "pending_deletion", "archived"]
                                    : ["all", "active", "archived"]
                                ).map((value) => (
                                    <label
                                        key={value}
                                        className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-sidebar-hover text-xs cursor-pointer"
                                    >
                                        <span className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                name="status-filter"
                                                value={value}
                                                checked={s.status === value}
                                                onChange={() => setS({ status: value })}
                                                className="h-3.5 w-3.5 accent-black cursor-pointer bg-background border-foreground"
                                            />
                                            {value === "active"
                                                ? "Active"
                                                : value === "all"
                                                  ? "All"
                                                  : (STATUS_CONFIG[value]?.label ?? value)}
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
                                            setS({ dir: s.dir === "asc" ? "desc" : "asc" })
                                        }
                                        className="flex items-center gap-1 text-xs cursor-pointer font-medium rounded-md px-1.5 py-0.5 transition-colors text-primary"
                                    >
                                        <ArrowUpDown size={12} />
                                        <span>
                                            {s.dir === "asc" ? "Asc" : "Desc"}
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
                                            checked={s.sort === option.value}
                                            onChange={() => setS({ sort: option.value })}
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
                                                    setS({ group: e.target.checked ? "1" : "0" })
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

                {items.length > 0 && (
                    <button
                        type="button"
                        onClick={toggleAll}
                        className="mb-2 text-xs text-muted-foreground hover:text-foreground w-fit cursor-pointer"
                    >
                        {selected.size === items.length ? "Deselect all" : "Select all"}
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

                    {!isLoading && !error && items.length === 0 && (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            No {type} found.
                        </p>
                    )}

                    {!isLoading &&
                        !error &&
                        !groupedByClient &&
                        items.map((item) => (
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
                        Object.entries(groupedByClient).map(([clientUuid, group]) => {
                            const groupSelected = group.items.filter((item) =>
                                selected.has(item.uuid),
                            ).length;
                            const groupAll = group.items.length;
                            const groupChecked = groupAll > 0 && groupSelected === groupAll;

                            const toggleGroup = () => {
                                setSelected((prev) => {
                                    const next = new Set(prev);
                                    if (groupChecked) {
                                        group.items.forEach((item) => next.delete(item.uuid));
                                    } else {
                                        group.items.forEach((item) => next.add(item.uuid));
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
                                    {group.items.map((item) => (
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
