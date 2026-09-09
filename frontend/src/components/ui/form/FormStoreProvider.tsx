import { type ReactNode } from "react";
import type { FormStore } from "./createFormStore";
import { FormStoreCtx } from "./useFormStoreForComponents";

export function FormStoreProvider<T extends Record<string, unknown>>({ store, children }: { store: FormStore<T>; children: ReactNode }) {
    return (
        <FormStoreCtx.Provider value={store as FormStore<Record<string, unknown>>}>
            {children}
        </FormStoreCtx.Provider>
    );
}
