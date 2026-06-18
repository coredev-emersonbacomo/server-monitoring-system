import { useState, useMemo } from "react";
import { Plus, Search, Landmark } from "lucide-react";
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
import type { components } from "@/api/schema";

type ClientData = components["schemas"]["ClientData"];

function StatCard({
    label,
    value,
    sub,
}: {
    label: string;
    value: number | string;
    sub?: string;
}) {
    return (
        <div className="bg-gray-50 border border-gray-100 rounded-lg px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-gray-400 font-medium mb-0.5">
                {label}
            </p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
        </div>
    );
}

type FilterTab = "all" | "with-servers" | "no-servers";

const TABS: { label: string; value: FilterTab }[] = [
    { label: "All", value: "all" },
    { label: "With Servers", value: "with-servers" },
    { label: "No Servers", value: "no-servers" },
];

const inputCls =
    "w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-gray-400 placeholder:text-gray-400";

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
        <div className="relative w-full bg-white rounded-lg border border-gray-100 p-6 shadow-sm flex flex-col items-center font-sans gap-3">
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
                <span className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <span
                        className={`w-1.5 h-1.5 rounded-full ${
                            client.servers_count > 0
                                ? "bg-green-500"
                                : "bg-gray-300"
                        }`}
                    />
                    {client.servers_count > 0
                        ? `${client.servers_count} server${client.servers_count !== 1 ? "s" : ""}`
                        : "No servers"}
                </span>
                <button
                    onClick={() => onDelete(client)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-0.5 rounded text-[11px]"
                >
                    Remove
                </button>
            </div>

            <div className="mt-4 mb-1">
                {client.banner_image_url ? (
                    <img
                        src={client.banner_image_url}
                        alt={client.name}
                        className="w-20 h-20 rounded-full object-cover border border-gray-100 shadow-sm"
                    />
                ) : (
                    <div className="w-20 h-20 rounded-full bg-gray-100 border border-gray-100 flex items-center justify-center text-gray-500 text-xl font-semibold shadow-sm">
                        {initials}
                    </div>
                )}
            </div>

            <div className="text-center w-full flex flex-col items-center gap-1.5">
                <Link
                    to={`/clients/${client.id}`}
                    className="text-[#1a629d] font-semibold text-base hover:underline"
                >
                    {client.name}
                </Link>

                <p className="text-gray-600 text-sm">{client.email}</p>

                {client.location && (
                    <p className="text-gray-400 text-xs">{client.location}</p>
                )}

                <div className="flex items-center gap-1.5 text-[#1a629d] font-medium text-sm mt-1">
                    <Landmark size={16} className="text-gray-400" />
                    <span>{client.contact_number}</span>
                </div>
            </div>
        </div>
    );
}

export default function Clients() {
    const navigate = useNavigate();
    const { data: clients, isLoading, error } = useClients();
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
    const totalServers =
        clients?.reduce((sum, c) => sum + c.servers_count, 0) ?? 0;

    return (
        <div className="flex flex-col gap-5">
            <div>
                <h1 className="text-xl font-semibold text-gray-900">
                    Client Management
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">
                    Manage client accounts and their associated servers.
                </p>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="relative flex-1 max-w-xs">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        />
                        <input
                            type="text"
                            placeholder="Search clients…"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className={inputCls}
                        />
                    </div>
                    <div className="flex gap-1">
                        {TABS.map((t) => (
                            <button
                                key={t.value}
                                onClick={() => setFilter(t.value)}
                                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                                    filter === t.value
                                        ? "bg-gray-900 text-white border-gray-900"
                                        : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={() => navigate("/clients/create")}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                    <Plus size={15} /> Add client
                </button>
            </div>

            <div className="grid grid-cols-4 gap-3">
                <StatCard label="Total clients" value={clients?.length ?? 0} />
                <StatCard
                    label="With servers"
                    value={clientsWithServers}
                    sub={
                        clients?.length
                            ? `${Math.round((clientsWithServers / clients.length) * 100)}% of total`
                            : undefined
                    }
                />
                <StatCard label="No servers" value={clientsWithoutServers} />
                <StatCard label="Total servers" value={totalServers} />
            </div>

            {isLoading && (
                <p className="text-sm text-gray-400">Loading clients...</p>
            )}

            {error && (
                <p className="text-sm text-red-500">Failed to load clients.</p>
            )}

            {!isLoading && !error && (
                <p className="text-xs uppercase tracking-widest text-gray-400 font-medium">
                    {visible.length} client{visible.length !== 1 ? "s" : ""}
                </p>
            )}

            {clients && visible.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <Search size={32} className="mb-3 opacity-30" />
                    <p className="text-sm">No clients match your search.</p>
                </div>
            ) : (
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
                                    ? "Deleting..."
                                    : "Delete"
                            }
                            disabled={deleteClient.isPending}
                            onClick={async () => {
                                if (deleting) {
                                    await deleteClient.mutateAsync(deleting.id);
                                    setDeleting(null);
                                }
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
