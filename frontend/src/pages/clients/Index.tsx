import { useState, useMemo } from "react";
import { Plus, Search, Landmark, RefreshCw } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { components } from "@/api/schema";

type ClientData = components["schemas"]["ClientData"];

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    sub,
    loading,
}: {
    label: string;
    value: number | string;
    sub?: string;
    loading?: boolean;
}) {
    if (loading) {
        return (
            <div className="bg-card border border-border rounded-lg px-4 py-3 animate-pulse">
                <div className="h-2.5 w-16 bg-muted rounded mb-2" />
                <div className="h-7 w-10 bg-muted rounded" />
            </div>
        );
    }
    return (
        <div className="bg-card border border-border rounded-lg px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">
                {label}
            </p>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
    );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = "all" | "with-servers" | "no-servers";

const TABS: { label: string; value: FilterTab }[] = [
    { label: "All",          value: "all" },
    { label: "With Servers", value: "with-servers" },
    { label: "No Servers",   value: "no-servers" },
];

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
    const initials = client.name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <div className="relative w-full bg-card rounded-lg border border-border p-6 shadow-sm flex flex-col items-center font-sans gap-3 transition-shadow hover:shadow-md">
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span
                        className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            client.servers_count > 0 ? "bg-emerald-500" : "bg-muted-foreground/40",
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
                {client.banner_image_url ? (
                    <img
                        src={client.banner_image_url}
                        alt={client.name}
                        className="w-20 h-20 rounded-full object-cover border border-border shadow-sm"
                    />
                ) : (
                    <div className="w-20 h-20 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground text-xl font-semibold shadow-sm">
                        {initials}
                    </div>
                )}
            </div>

            <div className="text-center w-full flex flex-col items-center gap-1.5">
                <Link
                    to={`/clients/${client.id}`}
                    className="text-primary font-semibold text-base hover:underline"
                >
                    {client.name}
                </Link>

                <p className="text-muted-foreground text-sm">{client.email}</p>

                {client.location && (
                    <p className="text-muted-foreground text-xs">{client.location}</p>
                )}

                <div className="flex items-center gap-1.5 text-primary font-medium text-sm mt-1">
                    <Landmark size={16} className="text-muted-foreground" />
                    <span>{client.contact_number}</span>
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Clients() {
    const navigate = useNavigate();
    const { data: clients, isLoading, isError, refetch } = useClients();
    const deleteClient = useDeleteClient();

    const [search, setSearch]   = useState("");
    const [filter, setFilter]   = useState<FilterTab>("all");
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
                (filter === "no-servers"   && c.servers_count === 0);
            return matchSearch && matchFilter;
        });
    }, [search, filter, clients]);

    const clientsWithServers    = clients?.filter((c) => c.servers_count > 0).length ?? 0;
    const clientsWithoutServers = clients?.filter((c) => c.servers_count === 0).length ?? 0;
    const totalServers          = clients?.reduce((s, c) => s + c.servers_count, 0) ?? 0;

    return (
        <div className="flex flex-col gap-5">
            {/* ── Header ── */}
            <div>
                <h1 className="text-xl font-semibold text-foreground">Client Management</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Manage client accounts and their associated servers.
                </p>
            </div>

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
                    <div className="flex gap-1">
                        {TABS.map((t) => (
                            <button
                                key={t.value}
                                onClick={() => setFilter(t.value)}
                                className={cn(
                                    "px-3 py-1.5 text-xs rounded-full border transition-colors",
                                    filter === t.value
                                        ? "bg-foreground text-background border-foreground"
                                        : "bg-transparent text-muted-foreground border-border hover:bg-muted",
                                )}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <Button
                    icon={<Plus size={15} />}
                    label="Add client"
                    onClick={() => navigate("/clients/create")}
                />
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-4 gap-3">
                <StatCard label="Total clients"   value={clients?.length ?? 0} loading={isLoading} />
                <StatCard
                    label="With servers"
                    value={clientsWithServers}
                    sub={clients?.length ? `${Math.round((clientsWithServers / clients.length) * 100)}% of total` : undefined}
                    loading={isLoading}
                />
                <StatCard label="No servers"    value={clientsWithoutServers} loading={isLoading} />
                <StatCard label="Total servers" value={totalServers}          loading={isLoading} />
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
                        <ClientCard key={c.id} client={c} onDelete={setDeleting} />
                    ))}
                </div>
            )}

            {/* ── Delete dialog ── */}
            <Dialog
                open={!!deleting}
                onOpenChange={(open) => { if (!open) setDeleting(null); }}
            >
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Delete Client</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to delete{" "}
                        <span className="font-medium text-foreground">{deleting?.name}</span>?
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <DialogClose asChild>
                            <Button variant="outline" label="Cancel" onClick={() => setDeleting(null)} />
                        </DialogClose>
                        <Button
                            variant="danger"
                            label={deleteClient.isPending ? "Deleting…" : "Delete"}
                            disabled={deleteClient.isPending}
                            onClick={async () => {
                                if (!deleting) return;
                                try {
                                    await deleteClient.mutateAsync(deleting.id);
                                    toast.success(`${deleting.name} has been deleted.`);
                                    setDeleting(null);
                                } catch {
                                    toast.error("Failed to delete client. Please try again.");
                                }
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
