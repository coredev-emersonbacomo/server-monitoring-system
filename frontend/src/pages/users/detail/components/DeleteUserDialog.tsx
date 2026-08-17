import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";

interface DeleteUserDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    userName?: string;
    isPending: boolean;
    onDelete: () => void;
}

export function DeleteUserDialog({
    open,
    onOpenChange,
    userName,
    isPending,
    onDelete,
}: DeleteUserDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Delete User</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    This will permanently delete{" "}
                    <strong className="text-foreground">{userName}</strong> and
                    all associated data. This cannot be undone.
                </p>
                <div className="flex justify-end gap-3 pt-2">
                    <DialogClose asChild>
                        <Button
                            variant="outline"
                            label="Cancel"
                            onClick={() => onOpenChange(false)}
                        />
                    </DialogClose>
                    <Button
                        variant="danger"
                        label={isPending ? "Deleting…" : "Delete"}
                        disabled={isPending}
                        onClick={onDelete}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
