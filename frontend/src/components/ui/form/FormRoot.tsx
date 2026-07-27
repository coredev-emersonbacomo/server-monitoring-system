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
            console.log("[FormRoot] submit fired", { store });
            const st = store.getState();
            console.log("[FormRoot] state", { submitHandler: !!st.submitHandler, mode: st.mode, hasChanges: st.hasChanges, form: st.form });

            if (!st.submitHandler) { console.log("[FormRoot] no submitHandler, returning"); return; }
            if (!store.validate()) { console.log("[FormRoot] validation failed"); return; }

            console.log("[FormRoot] calling submitHandler");
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
}

export function FormRoot<T extends Record<string, unknown>>({
    store,
    children,
    className,
}: FormRootProps<T>) {
    return (
        <FormStoreProvider store={store}>
            <FormShell store={store} className={className}>
                {children}
            </FormShell>
        </FormStoreProvider>
    );
}

// ─── Internal shell ──────────────────────────────────────────────────────────

function FormShell<T extends Record<string, unknown>>({
    children,
    className,
}: {
    store: FormStore<T>;
    children: ReactNode;
    className?: string;
}) {
    const handleSubmit = FormSubmitHandler();

    return (
        <form onSubmit={handleSubmit} className={className}>
            {children}
        </form>
    );
}
