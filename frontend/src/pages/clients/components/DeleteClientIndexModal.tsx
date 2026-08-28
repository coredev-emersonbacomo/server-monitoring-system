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
import type { ClientData } from "@/types/models";
import { useDeleteClient } from "@/hooks/useClients";

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

    const handleDelete = async () => {
        if (!client || confirmText !== client.name) return;
        try {
            await deleteClient.mutateAsync(client.uuid);
            toast.success(`${client.name} has been deleted.`);
            setConfirmText("");
            onClose();
        } catch (err: any) {
            toast.error(
                err?.response?.data?.message ||
                    err?.message ||
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
                            deleteClient.isPending || confirmText !== client?.name
                        }
                        onClick={handleDelete}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
