import { useEffect } from "react";
import { useFormStoreForComponents } from "./FormStoreProvider";

// ─── ValidationHandler ───────────────────────────────────────────────────────

export interface ValidationHandlerProps<T extends Record<string, unknown>> {
    handler: (data: T) => Record<string, string> | null;
}

export function ValidationHandler<T extends Record<string, unknown>>({
    handler,
}: ValidationHandlerProps<T>) {
    const store = useFormStoreForComponents();
    useEffect(() => {
        store.setState({ validationHandler: handler as (data: Record<string, unknown>) => Record<string, string> | null });
        return () => store.setState({ validationHandler: null });
    }, [handler, store]);
    return null;
}

// ─── SubmitHandler ───────────────────────────────────────────────────────────

export interface SubmitHandlerProps<T extends Record<string, unknown>> {
    handler: (data: T) => void | Promise<void>;
}

export function SubmitHandler<T extends Record<string, unknown>>({
    handler,
}: SubmitHandlerProps<T>) {
    const store = useFormStoreForComponents();
    useEffect(() => {
        store.setState({ submitHandler: handler as (data: Record<string, unknown>) => void | Promise<void> });
        return () => store.setState({ submitHandler: null });
    }, [handler, store]);
    return null;
}

// ─── DeleteHandler ───────────────────────────────────────────────────────────

export interface DeleteHandlerProps {
    handler: () => void | Promise<void>;
}

export function DeleteHandler({ handler }: DeleteHandlerProps) {
    const store = useFormStoreForComponents();
    useEffect(() => {
        store.setState({ deleteHandler: handler });
        return () => store.setState({ deleteHandler: null });
    }, [handler, store]);
    return null;
}
