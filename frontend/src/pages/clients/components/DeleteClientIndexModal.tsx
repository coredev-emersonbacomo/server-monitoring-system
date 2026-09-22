import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ClientData, ServerData } from "@/types/models";
import { useDeleteClient, useClientServers } from "@/hooks/useClients";
import { AlertTriangle } from "lucide-react";

interface DeleteClientIndexModalProps {
    client: ClientData | null;
    onClose: () => void;
}

export function DeleteClientIndexModal({
    client,
    onClose,
}: DeleteClientIndexModalProps) {
    const [confirmText, setConfirmText] = useState("");
    const deleteClient = useDeleteClient();

    const { data: servers = [] } = useClientServers(client?.uuid ?? "");

    const hasRunningAgents = servers.some(
        (s: ServerData & { has_registered_agent?: boolean }) =>
            !s.agent_deleted &&
            (s.has_registered_agent ??
                (s.agent && s.status !== "agent_uninstalled" && s.agent.status !== "revoked")) &&
            s.status !== "agent_uninstalled",
    );

    const handleDelete = async () => {
        if (!client || confirmText !== client.name) return;
        try {
            await deleteClient.mutateAsync(client.uuid);
            toast.success(`${client.name} has been deleted.`);
            setConfirmText("");
            onClose();
        } catch (err: unknown) {
            const apiError = err as {
                response?: { data?: { message?: string } };
                message?: string;
            };
            toast.error(
                apiError?.response?.data?.message ||
                apiError?.message ||
                "Failed to delete client. Please try again.",
            );
        }
    };

    return (
        <Dialog
            open={!!client}
            onOpenChange={(open) => {
                if (!open) {
                    setConfirmText("");
                    onClose();
                }
            }}
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 size={16} />
                        Delete Client
                    </DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    This will permanently delete{" "}
                    <strong className="text-foreground">{client?.name}</strong>
                    ? This action cannot be undone.
                </p>
                {hasRunningAgents && (
                    <div className="flex items-start gap-2 p-3.5 bg-destructive/5 border border-destructive/20 rounded-lg text-xs text-destructive">
                        <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold text-foreground">
                                Active Server Agents Running
                            </p>
                            <p className="text-muted-foreground mt-0.5">
                                You must uninstall the agent service on all
                                associated servers before you can delete this
                                client.
                            </p>
                        </div>
                    </div>
                )}

                <div className="flex flex-col gap-1.5 mt-2 mb-4">
                    <label className="text-xs text-muted-foreground">
                        Type{" "}
                        <span className="font-medium text-foreground">
                            {client?.name}
                        </span>{" "}
                        to confirm.
                    </label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        autoComplete="off"
                        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        placeholder={client?.name}
                    />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            label="Cancel"
                            onClick={() => {
                                setConfirmText("");
                                onClose();
                            }}
                        />
                    </DialogClose>
                    <Button
                        variant="danger"
                        label={deleteClient.isPending ? "Deleting…" : "Delete"}
                        disabled={
                            deleteClient.isPending ||
                            confirmText !== client?.name ||
                            hasRunningAgents
                        }
                        onClick={handleDelete}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
