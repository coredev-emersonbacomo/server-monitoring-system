import { useEffect, useState } from "react";
import { mockGetClientList } from "./client-report/mockClientList";
import { mockGetServerList } from "./server-report/mockServerList";

type EntityType = "clients" | "servers";
type PickerItem = any;

interface EntityPickerModalProps {
    type: EntityType;
    onSelect: (uuids: string[]) => void;
    onClose: () => void;
}

export function EntityPickerModal({ type, onSelect, onClose }: EntityPickerModalProps) {
    const [items, setItems] = useState<PickerItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());

    useEffect(() => {
        setLoading(true);
        const fetcher = type === "servers" ? mockGetServerList : mockGetClientList;
        fetcher().then((data) => {
            setItems(data);
            setLoading(false);
        });
    }, [type]);

    const filtered = items.filter((i) =>
        i.name.toLowerCase().includes(search.toLowerCase())
    );

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
            setSelected(new Set(filtered.map((i) => i.uuid)));
        }
    };

    const handleGenerate = () => {
        if (selected.size === 0) return;
        onSelect(Array.from(selected));
    };

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
                        className="text-muted-foreground hover:text-foreground text-sm"
                    >
                        ✕
                    </button>
                </div>

                <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={`Search ${type}...`}
                    className="w-full mb-3 px-3 py-2.5 rounded-lg border border-border bg-sidebar-hover text-sm outline-none"
                />

                {!loading && filtered.length > 0 && (
                    <button
                        onClick={toggleAll}
                        className="mb-2 text-xs text-muted-foreground hover:text-foreground w-fit"
                    >
                        {selected.size === filtered.length ? "Deselect all" : "Select all"}
                    </button>
                )}

                <div className="max-h-[24rem] overflow-y-auto flex flex-col gap-1">
                    {loading && (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            Loading...
                        </p>
                    )}

                    {!loading && filtered.length === 0 && (
                        <p className="text-sm text-muted-foreground py-8 text-center">
                            No {type} found.
                        </p>
                    )}

                    {!loading &&
                        filtered.map((item) => {
                            const isChecked = selected.has(item.uuid);
                            return (
                                <label
                                    key={item.uuid}
                                    className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-sidebar-hover text-sm cursor-pointer"
                                >
                                    <span className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => toggle(item.uuid)}
                                            className="accent-primary"
                                        />
                                        <span className="font-medium">{item.name}</span>
                                    </span>
                                    <span
                                        className={
                                            "status" in item && item.status === "online"
                                                ? "text-xs text-green-500"
                                                : "status" in item
                                                    ? "text-xs text-red-500"
                                                    : "text-xs text-muted-foreground"
                                        }
                                    >
                                        {"status" in item
                                            ? item.status
                                            : `${(item as any).total_servers} servers`}
                                    </span>
                                </label>
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
                        className="px-4 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        Generate Report
                    </button>
                </div>
            </div>
        </div>
    );
}