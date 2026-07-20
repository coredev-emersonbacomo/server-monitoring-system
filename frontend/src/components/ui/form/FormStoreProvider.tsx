import { createContext, useContext, type ReactNode } from "react";
import type { FormStore } from "./createFormStore";

const FormStoreCtx = createContext<FormStore<Record<string, unknown>> | null>(null);

export function FormStoreProvider<T extends Record<string, unknown>>({ store, children }: { store: FormStore<T>; children: ReactNode }) {
    return (
        <FormStoreCtx.Provider value={store as FormStore<Record<string, unknown>>}>
            {children}
        </FormStoreCtx.Provider>
    );
}

export function useFormStoreForComponents(): FormStore<Record<string, unknown>> {
    const store = useContext(FormStoreCtx);
    if (!store) throw new Error("Form component must be inside <Form.Root>");
    return store;
}
