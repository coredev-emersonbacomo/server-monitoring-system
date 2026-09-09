import { createContext, useContext } from "react";
import type { FormStore } from "./createFormStore";

export const FormStoreCtx =
    createContext<FormStore<Record<string, unknown>> | null>(null);

export function useFormStoreForComponents(): FormStore<
    Record<string, unknown>
> {
    const store = useContext(FormStoreCtx);
    if (!store) throw new Error("Form component must be inside <Form.Root>");
    return store;
}
