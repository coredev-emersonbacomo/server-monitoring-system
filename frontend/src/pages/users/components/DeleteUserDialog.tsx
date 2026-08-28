import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";

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
        <ConfirmDeleteDialog
            open={open}
            onOpenChange={onOpenChange}
            title="Delete User"
            resourceName={userName ?? ""}
            description={
                <>
                    This will permanently delete{" "}
                    <strong className="text-foreground">{userName}</strong> and
                    all associated data. This cannot be undone.
                </>
            }
            onConfirm={onDelete}
            isPending={isPending}
        />
    );
}
