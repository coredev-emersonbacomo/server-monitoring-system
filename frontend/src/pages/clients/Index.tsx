import { useState, useMemo } from "react";
import {
    Plus,
    Search,
    Landmark,
    RefreshCw,
    Filter,
    ChevronDown,
} from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useClients, useDeleteClient } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { components } from "@/api/schema";
import IndexHeader from "@/components/IndexHeader";

type ClientData = components["schemas"]["ClientData"];

type FilterTab = "all" | "with-servers" | "no-servers";

// ─── Skeleton grid ────────────────────────────────────────────────────────────

function SkeletonGrid() {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="bg-card border border-border rounded-lg p-6 flex flex-col items-center gap-3 animate-pulse"
                >
                    <div className="w-20 h-20 rounded-full bg-muted" />
                    <div className="h-4 w-28 bg-muted rounded" />
                    <div className="h-3 w-36 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                </div>
            ))}
        </div>
    );
}

// ─── Client card ─────────────────────────────────────────────────────────────

function ClientCard({
    client,
    onDelete,
}: {
    client: ClientData;
    onDelete: (c: ClientData) => void;
}) {
    return (
        <Link
            to={`/clients/${client.id}`}
            className="block rounded-lg transition-transform duration-200 hover:-translate-y-1"
        >
            <div className="relative size-full bg-card rounded-lg border border-border p-6 shadow-sm flex flex-col items-center font-sans gap-3 transition-shadow hover:shadow-md">
                <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                    <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span
                            className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                client.servers_count > 0
                                    ? "bg-emerald-500"
                                    : "bg-muted-foreground/40",
                            )}
                        />
                        {client.servers_count > 0
                            ? `${client.servers_count} server${client.servers_count !== 1 ? "s" : ""}`
                            : "No servers"}
                    </span>
                    <button
                        onClick={() => onDelete(client)}
                        className="text-muted-foreground hover:text-destructive transition-colors p-0.5 rounded text-[11px]"
                    >
                        Remove
                    </button>
                </div>

                <div className="mt-4 mb-1">
                    <img
                        src={client.banner_image_url}
                        alt={client.name}
                        className="w-20 h-20 rounded-full object-cover border border-border shadow-sm"
                    />
                </div>

                <div className="text-center w-full flex flex-col items-center gap-1.5">
                    {client.name}

                    <p className="text-muted-foreground text-sm">
                        {client.email}
                    </p>

                    {client.location && (
                        <p className="text-muted-foreground text-xs">
                            {client.location}
                        </p>
                    )}

                    <div className="flex items-center gap-1.5  text-muted-foreground text-sm mt-1">
                        <Landmark size={16} className="text-muted-foreground" />
                        <span>
                            {client.contact_number
                                .replace(/\D/g, "")
                                .replace(/^(\d{3})(\d{4})(\d{4})$/, "$1-$2-$3")}
                        </span>
                    </div>
                </div>
            </div>
        </Link>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Clients() {
    const navigate = useNavigate();
    const { data: clients, isLoading, isError, refetch } = useClients();
    const deleteClient = useDeleteClient();

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<FilterTab>("all");
    const [deleting, setDeleting] = useState<ClientData | null>(null);

    const visible = useMemo(() => {
        const q = search.toLowerCase();
        return (clients ?? []).filter((c) => {
            const matchSearch =
                !q ||
                c.name.toLowerCase().includes(q) ||
                c.email.toLowerCase().includes(q) ||
                c.location?.toLowerCase().includes(q) ||
                c.contact_number.toLowerCase().includes(q);
            const matchFilter =
                filter === "all" ||
                (filter === "with-servers" && c.servers_count > 0) ||
                (filter === "no-servers" && c.servers_count === 0);
            return matchSearch && matchFilter;
        });
    }, [search, filter, clients]);

    const clientsWithServers =
        clients?.filter((c) => c.servers_count > 0).length ?? 0;
    const clientsWithoutServers =
        clients?.filter((c) => c.servers_count === 0).length ?? 0;

    const filterOptions = [
        {
            label: "All",
            value: "all" as FilterTab,
            count: clients?.length ?? 0,
        },
        {
            label: "With Servers",
            value: "with-servers" as FilterTab,
            count: clientsWithServers,
        },
        {
            label: "No Servers",
            value: "no-servers" as FilterTab,
            count: clientsWithoutServers,
        },
    ];

    const currentFilterLabel =
        filterOptions.find((o) => o.value === filter)?.label ?? "All";

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
            <IndexHeader
                icon={Landmark}
                title="Client Management"
                description="Manage client accounts and their associated servers."
            />

            <main className="py-6 w-full flex-1 min-h-0 flex flex-col gap-5">
                {/* ── Toolbar ── */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="relative flex-1 max-w-xs">
                            <Search
                                size={14}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                            />
                            <input
                                type="text"
                                placeholder="Search clients…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground transition-colors"
                            />
                        </div>

                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    icon={<Filter size={14} />}
                                    className="gap-1"
                                >
                                    {currentFilterLabel}
                                    <ChevronDown size={14} />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent align="start" className="w-48 p-1">
                                {filterOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setFilter(option.value)}
                                        className={cn(
                                            "flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                                            filter === option.value
                                                ? "bg-accent text-accent-foreground"
                                                : "hover:bg-muted text-foreground",
                                        )}
                                    >
                                        <span>{option.label}</span>
                                        <span className="text-xs text-muted-foreground">
                                            {option.count}
                                        </span>
                                    </button>
                                ))}
                            </PopoverContent>
                        </Popover>
                    </div>

                    <Button
                        icon={<Plus size={15} />}
                        label="Add client"
                        onClick={() => navigate("/clients/create")}
                    />
                </div>

                {/* ── Error state ── */}
                {isError && (
                    <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                        <Landmark size={32} className="opacity-20" />
                        <p className="text-sm">Failed to load clients.</p>
                        <Button
                            variant="outline"
                            size="sm"
                            icon={<RefreshCw size={14} />}
                            label="Retry"
                            onClick={() => refetch()}
                        />
                    </div>
                )}

                {/* ── Count label ── */}
                {!isLoading && !isError && (
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                        {visible.length} client{visible.length !== 1 ? "s" : ""}
                    </p>
                )}

                {/* ── Loading skeleton ── */}
                {isLoading && <SkeletonGrid />}

                {/* ── Empty state ── */}
                {!isLoading && !isError && clients && visible.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                        <Landmark size={40} className="opacity-20" />
                        <p className="text-sm font-medium">
                            {search || filter !== "all"
                                ? "No clients match your search."
                                : "No clients yet."}
                        </p>
                        <p className="text-xs opacity-60">
                            {search || filter !== "all"
                                ? "Try adjusting your filters or search term."
                                : "Add your first client to get started."}
                        </p>
                        {!search && filter === "all" && (
                            <Button
                                size="sm"
                                icon={<Plus size={14} />}
                                label="Add client"
                                onClick={() => navigate("/clients/create")}
                            />
                        )}
                    </div>
                )}

                {/* ── Card grid ── */}
                {!isLoading && !isError && visible.length > 0 && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                        {visible.map((c) => (
                            <ClientCard
                                key={c.id}
                                client={c}
                                onDelete={setDeleting}
                            />
                        ))}
                    </div>
                )}

                {/* ── Delete dialog ── */}
                <Dialog
                    open={!!deleting}
                    onOpenChange={(open) => {
                        if (!open) setDeleting(null);
                    }}
                >
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Delete Client</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to delete{" "}
                            <span className="font-medium text-foreground">
                                {deleting?.name}
                            </span>
                            ? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <DialogClose asChild>
                                <Button
                                    variant="outline"
                                    label="Cancel"
                                    onClick={() => setDeleting(null)}
                                />
                            </DialogClose>
                            <Button
                                variant="danger"
                                label={
                                    deleteClient.isPending
                                        ? "Deleting…"
                                        : "Delete"
                                }
                                disabled={deleteClient.isPending}
                                onClick={async () => {
                                    if (!deleting) return;
                                    try {
                                        await deleteClient.mutateAsync(
                                            deleting.id,
                                        );
                                        toast.success(
                                            `${deleting.name} has been deleted.`,
                                        );
                                        setDeleting(null);
                                    } catch {
                                        toast.error(
                                            "Failed to delete client. Please try again.",
                                        );
                                    }
                                }}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}
