import { useState, useMemo, useEffect } from "react";
import { Landmark, Check, CheckSquare, Square, Search, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useClients } from "@/hooks/useClients";
import { cn } from "@/lib/utils";

interface MultiSelectClientsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    selectedClientUuids: string[];
    onApply: (selectedUuids: string[]) => void;
}

export function MultiSelectClientsDialog({
    open,
    onOpenChange,
    title = "Filter Servers by Clients",
    description = "Select one or more clients to view their servers.",
    selectedClientUuids,
    onApply,
}: MultiSelectClientsDialogProps) {
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(
        () => new Set(selectedClientUuids),
    );

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 250);
        return () => clearTimeout(timer);
    }, [search]);

    // Sync selected set whenever dialog opens or selectedClientUuids change
    useEffect(() => {
        if (open) {
            setSelected(new Set(selectedClientUuids));
            setSearch("");
            setDebouncedSearch("");
        }
    }, [open, selectedClientUuids]);

    const { data: response, isLoading } = useClients(
        {
            q: debouncedSearch || undefined,
            per_page: 150,
        },
        { enabled: open },
    );
    const clients = useMemo(() => response?.data ?? [], [response]);

    const allFilteredSelected = useMemo(() => {
        if (clients.length === 0) return false;
        return clients.every((c) => selected.has(c.uuid));
    }, [clients, selected]);

    const toggleSelect = (uuid: string) => {
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

    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            // Deselect all filtered clients
            setSelected((prev) => {
                const next = new Set(prev);
                for (const c of clients) {
                    next.delete(c.uuid);
                }
                return next;
            });
        } else {
            // Select all filtered clients
            setSelected((prev) => {
                const next = new Set(prev);
                for (const c of clients) {
                    next.add(c.uuid);
                }
                return next;
            });
        }
    };

    const handleApply = () => {
        onApply(Array.from(selected));
        onOpenChange(false);
    };

    const handleClear = () => {
        setSelected(new Set());
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-6">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                        <Landmark className="size-5 text-primary" />
                        <span>{title}</span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-3 flex-1 min-h-0">
                    <p className="text-xs text-muted-foreground">{description}</p>

                    {/* Search & Select All Actions */}
                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search clients…"
                                className="w-full bg-background border border-border rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            icon={
                                allFilteredSelected ? (
                                    <CheckSquare className="size-3.5 text-primary" />
                                ) : (
                                    <Square className="size-3.5 text-muted-foreground" />
                                )
                            }
                            label={allFilteredSelected ? "Deselect All" : "Select All"}
                            onClick={toggleSelectAll}
                            className="cursor-pointer text-xs shrink-0"
                            disabled={clients.length === 0}
                        />
                    </div>

                    {/* Selection Counter Bar */}
                    <div className="flex items-center justify-between text-xs px-1 text-muted-foreground">
                        <span>
                            <strong className="text-foreground font-medium">
                                {selected.size}
                            </strong>{" "}
                            {selected.size === 1 ? "client" : "clients"} selected
                        </span>
                        {selected.size > 0 && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="text-xs text-primary hover:underline cursor-pointer"
                            >
                                Clear selection
                            </button>
                        )}
                    </div>

                    {/* Client List */}
                    <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 min-h-[220px] max-h-[340px] border border-border/40 rounded-lg p-1.5 bg-muted/20">
                        {isLoading ? (
                            <div className="flex items-center justify-center py-10">
                                <Loader2 className="size-6 animate-spin text-primary" />
                            </div>
                        ) : clients.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-1">
                                <Landmark className="size-8 opacity-30" />
                                <p className="text-xs">No clients found</p>
                            </div>
                        ) : (
                            clients.map((c) => {
                                const isChecked = selected.has(c.uuid);
                                return (
                                    <div
                                        key={c.uuid}
                                        onClick={() => toggleSelect(c.uuid)}
                                        className={cn(
                                            "flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer select-none",
                                            isChecked
                                                ? "bg-primary/10 border-primary/40 text-foreground"
                                                : "bg-card border-border/40 hover:border-border hover:bg-muted/50 text-foreground",
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div
                                                className={cn(
                                                    "w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0",
                                                    isChecked
                                                        ? "bg-primary border-primary text-primary-foreground"
                                                        : "border-muted-foreground/40 bg-background",
                                                )}
                                            >
                                                {isChecked && <Check className="size-3 stroke-[3]" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold truncate">
                                                    {c.name}
                                                </p>
                                                {c.location && (
                                                    <p className="text-[10px] text-muted-foreground truncate">
                                                        {c.location}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <span className="text-[11px] font-medium text-muted-foreground px-2 py-0.5 rounded-full bg-muted/80 shrink-0 ml-2">
                                            {c.servers_count ?? 0}{" "}
                                            {(c.servers_count ?? 0) === 1
                                                ? "server"
                                                : "servers"}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between gap-3 pt-4 border-t border-border/60 mt-2">
                    <DialogClose asChild>
                        <Button variant="outline" label="Cancel" className="cursor-pointer" />
                    </DialogClose>

                    <Button
                        variant="default"
                        label={
                            selected.size > 0
                                ? `Apply Filter (${selected.size})`
                                : "Show All Servers"
                        }
                        onClick={handleApply}
                        className="cursor-pointer font-medium"
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
