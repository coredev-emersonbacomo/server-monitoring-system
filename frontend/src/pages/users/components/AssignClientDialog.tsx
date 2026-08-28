import { useMemo, useState } from "react";
import { Building, Loader2 } from "lucide-react";
import { DebouncedSearchInput } from "@/components/DebouncedSearchInput";
import { useUrlState } from "@/hooks/useUrlState";
import { useClients } from "@/hooks/useClients";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface AssignClientDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    excludedUuids: string[];
    secopLimit?: number;
    isAdding: boolean;
    onAssignClient: (clientUuid: string, clientName: string) => void;
    paramName?: string;
}

export function AssignClientDialog({
    open,
    onOpenChange,
    excludedUuids,
    secopLimit,
    isAdding,
    onAssignClient,
    paramName = "assign_client_q",
}: AssignClientDialogProps) {
    const [selectedClientToAdd, setSelectedClientToAdd] = useState<string | null>(
        null,
    );

    const [s] = useUrlState({ q: { default: "" } });
    const { data: response, isLoading } = useClients({
        q: s.q || undefined,
        exclude_user_uuid: excludedUuids.join(",") || undefined,
        per_page: 50,
    });
    const clients = useMemo(() => response?.data ?? [], [response]);

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
                    <DebouncedSearchInput
                        paramName={paramName}
                        debounceMs={300}
                        placeholder="Search Clients..."
                    />

                    {isLoading ? (
                        <div className="space-y-2">
                            {[0, 1, 2].map((i) => (
                                <div
                                    key={i}
                                    className="h-10 bg-muted rounded animate-pulse"
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto animate-fade-in-up duration-150">
                            {clients.map((client) => (
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
                                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                                            <span>{client.location || "No location"}</span>
                                            {typeof client.secops_count === "number" && !!secopLimit && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-medium text-muted-foreground">
                                                    {client.secops_count}/{secopLimit} SecOps
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                    {selectedClientToAdd === client.uuid && isAdding && (
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    )}
                                </button>
                            ))}
                            {clients.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">
                                    {s.q
                                        ? "No matching clients found."
                                        : "All clients are already assigned."}
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
