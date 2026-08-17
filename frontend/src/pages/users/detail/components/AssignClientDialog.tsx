import { useState } from "react";
import { Search, Building, Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface AssignClientDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    availableClients: Array<{
        uuid: string;
        name: string;
        location?: string;
        banner_image_url?: string;
    }>;
    isAdding: boolean;
    onAssignClient: (clientUuid: string, clientName: string) => void;
}

export function AssignClientDialog({
    open,
    onOpenChange,
    availableClients,
    isAdding,
    onAssignClient,
}: AssignClientDialogProps) {
    const [clientSearch, setClientSearch] = useState("");
    const [selectedClientToAdd, setSelectedClientToAdd] = useState<string | null>(
        null,
    );

    const filtered = availableClients.filter((client) => {
        const q = clientSearch.trim().toLowerCase();
        if (!q) return true;
        return (
            client.name.toLowerCase().includes(q) ||
            (client.location && client.location.toLowerCase().includes(q))
        );
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign Client</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col gap-4">
                    <p className="text-xs text-muted-foreground">
                        Select a client account to assign to this user.
                    </p>
                    <div className="relative">
                        <Search
                            size={16}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                        />

                        <input
                            type="text"
                            value={clientSearch}
                            onChange={(e) => setClientSearch(e.target.value)}
                            placeholder="Search Clients..."
                            className="w-full h-10 rounded-lg border border-border bg-background pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        />
                    </div>

                    <div className="space-y-2 max-h-64 overflow-y-auto animate-fade-in-up duration-150">
                        {filtered.map((client) => (
                            <button
                                key={client.uuid}
                                onClick={() => {
                                    setSelectedClientToAdd(client.uuid);
                                    onAssignClient(client.uuid, client.name);
                                }}
                                disabled={
                                    isAdding ||
                                    selectedClientToAdd === client.uuid
                                }
                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 text-left border border-border/40 hover:border-border cursor-pointer"
                            >
                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                                    {client.banner_image_url ? (
                                        <img
                                            src={client.banner_image_url}
                                            alt={client.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <Building
                                            size={14}
                                            className="text-muted-foreground"
                                        />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                        {client.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {client.location}
                                    </p>
                                </div>
                                {selectedClientToAdd === client.uuid && isAdding && (
                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                )}
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                {clientSearch
                                    ? "No matching clients found."
                                    : "All clients are already assigned."}
                            </p>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
