import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import type { ServerData } from "@/types/models";

interface DeleteClientDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientName?: string;
    servers: ServerData[];
    isPending: boolean;
    onDelete: () => void;
}

export function DeleteClientDialog({
    open,
    onOpenChange,
    clientName,
    servers,
    isPending,
    onDelete,
}: DeleteClientDialogProps) {
    const [deleteConfirmText, setDeleteConfirmText] = useState("");

    const hasRunningAgents = servers.some((s) => !s.agent_deleted && s.agent);

    return (
        <Dialog
            open={open}
            onOpenChange={(val) => {
                onOpenChange(val);
                if (!val) setDeleteConfirmText("");
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
                    <strong className="text-foreground">{clientName}</strong> and
                    all associated data. This cannot be undone.
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

                <div className="flex flex-col gap-2 pt-1">
                    <label className="text-xs text-muted-foreground">
                        Type{" "}
                        <strong className="text-foreground font-mono">
                            {clientName}
                        </strong>{" "}
                        to confirm
                    </label>
                    <Input
                        value={deleteConfirmText}
                        onChange={(e) => setDeleteConfirmText(e.target.value)}
                        placeholder={clientName}
                        autoFocus
                        className="font-mono text-sm"
                    />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            label="Cancel"
                            onClick={() => {
                                onOpenChange(false);
                                setDeleteConfirmText("");
                            }}
                        />
                    </DialogClose>
                    <Button
                        variant="danger"
                        label={isPending ? "Deleting…" : "Delete"}
                        disabled={
                            deleteConfirmText !== clientName ||
                            isPending ||
                            hasRunningAgents
                        }
                        onClick={onDelete}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
