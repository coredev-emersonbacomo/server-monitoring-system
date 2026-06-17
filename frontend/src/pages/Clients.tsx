import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Landmark, Loader2, Pencil, Trash2 } from "lucide-react";
import { useClients, useDeleteClient } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogClose,
} from "@/components/ui/dialog";
import type { components } from "@/api/schema";

type ClientData = components["schemas"]["ClientData"];

export default function Clients() {
    const { data: clients, isLoading, error } = useClients();
    const deleteClient = useDeleteClient();

    const [searchQuery, setSearchQuery] = useState("");
    const [deleting, setDeleting] = useState<ClientData | null>(null);

    const filtered = clients?.filter(
        (c) =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.email.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
            <header className="border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Landmark className="w-5 h-5 text-primary" />
                            </div>
                            <h1 className="text-lg font-semibold tracking-tight">
                                Clients
                            </h1>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder="Search clients..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-muted/50 border-transparent focus:bg-background border focus:border-primary/50 focus:ring-2 focus:ring-primary/20 rounded-lg text-sm transition-all outline-none"
                                />
                            </div>
                            <Link to="/clients/create">
                                <Button icon={<Plus className="w-4 h-4" />} label="Add Client" />
                            </Link>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
                {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : error ? (
                    <div className="text-sm text-destructive">Failed to load clients</div>
                ) : !filtered?.length ? (
                    <div className="text-sm text-muted-foreground text-center py-16">
                        No clients found
                    </div>
                ) : (
                    <div className="rounded-lg border border-border/60 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border/40 bg-muted/30">
                                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Name</th>
                                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Location</th>
                                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Email</th>
                                    <th className="text-left font-medium text-muted-foreground px-4 py-3">Contact</th>
                                    <th className="text-right font-medium text-muted-foreground px-4 py-3 w-32">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {filtered.map((client) => (
                                    <tr key={client.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-4 py-3 font-medium">{client.name}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{client.location}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{client.email}</td>
                                        <td className="px-4 py-3 text-muted-foreground">{client.contact_number}</td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Link to={`/clients/${client.id}/edit`}>
                                                    <Button variant="outline" icon={<Pencil className="w-4 h-4" />} className="px-2 py-1" />
                                                </Link>
                                                <Dialog
                                                    open={deleting?.id === client.id}
                                                    onOpenChange={(open) => { if (!open) setDeleting(null); }}
                                                >
                                                    <DialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            icon={<Trash2 className="w-4 h-4 text-destructive" />}
                                                            className="px-2 py-1"
                                                            onClick={() => setDeleting(client)}
                                                        />
                                                    </DialogTrigger>
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
                                                                label={deleteClient.isPending ? "Deleting..." : "Delete"}
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
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
