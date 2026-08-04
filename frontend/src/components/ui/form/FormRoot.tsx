import { useCallback, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { FormStoreProvider, useFormStoreForComponents } from "./FormStoreProvider";
import type { FormStore } from "./createFormStore";

// ─── Error extraction helper ─────────────────────────────────────────────────

function extractApiErrors(err: unknown): Record<string, string> | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (err as any)?.response?.data || (err as any)?.data || err;
    if (data && typeof data === "object" && "errors" in data) {
        const raw = data.errors as Record<string, unknown>;
        const mapped: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw)) {
            mapped[k] = Array.isArray(v) ? v[0] : String(v);
        }
        return mapped;
    }
    if (data && typeof data === "object" && "message" in data) {
        return { _form: data.message as string };
    }
    return null;
}

// ─── Internal form submit handler ────────────────────────────────────────────


function FormSubmitHandler() {
    const store = useFormStoreForComponents();

    const handleSubmit = useCallback(
        async (e: FormEvent) => {
            e.preventDefault();
            const st = store.getState();

            if (!st.submitHandler) return;
            if (!store.validate()) return;
            store.setState({ isSubmitting: true });
            try {
                await st.submitHandler(st.form);
            } catch (err) {
                const apiErrors = extractApiErrors(err);
                if (apiErrors) {
                    store.setState({ errors: apiErrors });
                    if (apiErrors._form) {
                        toast.error(apiErrors._form);
                    }
                } else {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const msg = (err as any)?.message || "An error occurred.";
                    toast.error(msg);
                }
            } finally {
                store.setState({ isSubmitting: false });
            }
        },
        [store],
    );

    return handleSubmit;
}

// ─── FormRoot ────────────────────────────────────────────────────────────────

export interface FormRootProps<T extends Record<string, unknown>> {
    store: FormStore<T>;
    children: ReactNode;
    className?: string;
    id?: string;
}

export function FormRoot<T extends Record<string, unknown>>({
    store,
    children,
    className,
    id,
}: FormRootProps<T>) {
    return (
        <FormStoreProvider store={store}>
            <FormShell store={store} className={className} id={id}>
                {children}
            </FormShell>
        </FormStoreProvider>
    );
}

// ─── Internal shell ──────────────────────────────────────────────────────────

function FormShell<T extends Record<string, unknown>>({
    children,
    className,
    id,
}: {
    store: FormStore<T>;
    children: ReactNode;
    className?: string;
    id?: string;
}) {
    const handleSubmit = FormSubmitHandler();

    return (
        <form id={id} onSubmit={handleSubmit} className={className}>
            {children}
        </form>
    );
}