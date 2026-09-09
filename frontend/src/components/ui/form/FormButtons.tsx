import { useState, type ReactNode, type ComponentPropsWithoutRef } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFormStoreForComponents } from "./useFormStoreForComponents";
import { useForm } from "./createFormStore";

type ButtonProps = ComponentPropsWithoutRef<typeof Button>;
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

// ─── Form.Button — base ──────────────────────────────────────────────────────

export interface FormButtonProps extends ButtonProps {
    disableOnSubmitting?: boolean;
}

export function FormButton({
    disableOnSubmitting = true,
    disabled,
    children,
    ...props
}: FormButtonProps) {
    const store = useFormStoreForComponents();
    const isSubmitting = useForm(store, (s) => s.isSubmitting);
    const isDisabled = disableOnSubmitting
        ? isSubmitting || disabled
        : disabled;
    return (
        <Button disabled={isDisabled} {...props}>
            {children}
        </Button>
    );
}

// ─── Form.Buttons.Cancel ─────────────────────────────────────────────────────

export interface FormCancelProps extends Omit<ButtonProps, "variant" | "type"> {
    onCancel?: () => void;
}

export function FormCancel({ children, onCancel, ...props }: FormCancelProps) {
    const store = useFormStoreForComponents();
    return (
        <FormButton
            variant="outline"
            type="button"
            onClick={() => {
                store.setMode("view");
                onCancel?.();
            }}
            {...props}
        >
            {children ?? "Cancel"}
        </FormButton>
    );
}

// ─── Form.Buttons.Edit ───────────────────────────────────────────────────────

export interface FormEditProps extends Omit<ButtonProps, "variant" | "type"> {
    onEdit?: () => void;
}

export function FormEdit({ children, onEdit, ...props }: FormEditProps) {
    const store = useFormStoreForComponents();
    return (
        <FormButton
            variant="outline"
            icon={<Pencil size={14} />}
            type="button"
            onClick={() => {
                store.setMode("edit");
                onEdit?.();
            }}
            {...props}
        >
            {children ?? "Edit"}
        </FormButton>
    );
}

// ─── Form.Buttons.Submit ─────────────────────────────────────────────────────

export function FormSubmit({ children, ...props }: Omit<ButtonProps, "type">) {
    const store = useFormStoreForComponents();
    const hasChanges = useForm(store, (s) => s.hasChanges);
    const isSubmitting = useForm(store, (s) => s.isSubmitting);
    return (
        <FormButton
            type="submit"
            disabled={!hasChanges || isSubmitting}
            {...props}
        >
            {children ?? (isSubmitting ? "Saving…" : "Save")}
        </FormButton>
    );
}

// ─── Form.Buttons.Delete ─────────────────────────────────────────────────────

export interface FormDeleteProps extends Omit<
    ButtonProps,
    "variant" | "type" | "onClick"
> {
    confirmTitle?: string;
    confirmMessage?: string;
}

export function FormDelete({
    confirmTitle = "Delete",
    confirmMessage = "Are you sure you want to delete this? This action cannot be undone.",
    children,
    ...props
}: FormDeleteProps) {
    const store = useFormStoreForComponents();
    const isSubmitting = useForm(store, (s) => s.isSubmitting);
    const { deleteHandler } = store.getState();
    const [open, setOpen] = useState(false);

    if (!deleteHandler) return null;

    return (
        <>
            <FormButton
                variant="danger"
                type="button"
                disabled={isSubmitting}
                onClick={() => setOpen(true)}
                {...props}
            >
                {children ?? "Delete"}
            </FormButton>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>{confirmTitle}</DialogTitle>
                        <DialogDescription>{confirmMessage}</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2 pt-4">
                        <FormButton
                            variant="outline"
                            type="button"
                            onClick={() => setOpen(false)}
                        >
                            Cancel
                        </FormButton>
                        <FormButton
                            variant="danger"
                            type="button"
                            onClick={async () => {
                                setOpen(false);
                                await deleteHandler();
                            }}
                        >
                            Confirm
                        </FormButton>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}

// ─── Form.DeleteModal — custom delete dialog ──────────────────────────────────

export interface FormDeleteModalProps {
    children?: ReactNode;
    title?: string;
    message?: string;
    buttonProps?: FormButtonProps;
    modal?: (show: (v: boolean) => void) => ReactNode;
    onOpenChange?: (open: boolean) => void;
}

export function FormDeleteModal({
    children,
    title = "Delete",
    message = "Are you sure you want to delete this? This action cannot be undone.",
    buttonProps,
    modal,
    onOpenChange,
}: FormDeleteModalProps) {
    const store = useFormStoreForComponents();
    const isSubmitting = useForm(store, (s) => s.isSubmitting);
    const { deleteHandler } = store.getState();
    const [open, setOpen] = useState(false);

    if (!deleteHandler && !modal) return null;

    const showDialog = (v: boolean) => {
        setOpen(v);
        onOpenChange?.(v);
    };

    return (
        <>
            <FormButton
                variant="danger"
                type="button"
                disabled={isSubmitting}
                onClick={() => setOpen(true)}
                {...buttonProps}
            >
                {children ?? "Delete"}
            </FormButton>

            <Dialog open={open} onOpenChange={showDialog}>
                {modal ? (
                    modal(showDialog)
                ) : (
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>{title}</DialogTitle>
                            <DialogDescription>{message}</DialogDescription>
                        </DialogHeader>
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2 pt-4">
                            <FormButton
                                variant="outline"
                                type="button"
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </FormButton>
                            <FormButton
                                variant="danger"
                                type="button"
                                onClick={async () => {
                                    setOpen(false);
                                    await deleteHandler!();
                                }}
                            >
                                Confirm
                            </FormButton>
                        </div>
                    </DialogContent>
                )}
            </Dialog>
        </>
    );
}
