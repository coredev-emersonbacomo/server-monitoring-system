import { useState, type ReactNode } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";

interface ConfirmDeleteDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Dialog title, e.g. "Delete User". */
    title: string;
    /** The exact text the user must type to enable the confirm button. */
    resourceName: string;
    /** Explanatory copy shown above the confirm input. */
    description?: ReactNode;
    /** Extra content (warnings, command snippets) rendered between the copy and the input. */
    children?: ReactNode;
    /** Label for the destructive confirm button. */
    confirmLabel?: string;
    onConfirm: () => void;
    isPending?: boolean;
    /** Additional gate beyond the typed confirmation (e.g. running agents present). */
    disabled?: boolean;
}

/**
 * Shared destructive-action confirmation: the user must type the resource name
 * to enable the red confirm button. Used for every delete in the app so the
 * confirmation behaviour is identical everywhere.
 */
export function ConfirmDeleteDialog({
    open,
    onOpenChange,
    title,
    resourceName,
    description,
    children,
    confirmLabel = "Delete",
    onConfirm,
    isPending = false,
    disabled = false,
}: ConfirmDeleteDialogProps) {
    const [text, setText] = useState("");

    const handleOpenChange = (next: boolean) => {
        if (!next) {
            setText("");
        }
        onOpenChange(next);
    };

    const confirmed = text === resourceName;

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-destructive">
                        <Trash2 size={16} />
                        {title}
                    </DialogTitle>
                </DialogHeader>

                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}

                {children}

                <div className="flex flex-col gap-1.5">
                    <label className="text-xs text-muted-foreground">
                        Type{" "}
                        <strong className="text-foreground font-mono">
                            {resourceName}
                        </strong>{" "}
                        to confirm.
                    </label>
                    <input
                        type="text"
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder={resourceName}
                        autoComplete="off"
                        className="h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-destructive"
                    />
                </div>

                <div className="flex justify-end gap-2 pt-1">
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            label="Cancel"
                            onClick={() => setText("")}
                        />
                    </DialogClose>
                    <Button
                        variant="danger"
                        size="sm"
                        icon={
                            isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : undefined
                        }
                        label={isPending ? `${confirmLabel}…` : confirmLabel}
                        onClick={() => {
                            onConfirm();
                            setText("");
                        }}
                        disabled={isPending || !confirmed || disabled}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
