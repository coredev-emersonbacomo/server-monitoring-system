import { useSyncExternalStore } from "react";
import { z } from "zod";

export type FormMode = "view" | "create" | "edit";

// ─── Raw state (mutable inside the store) ────────────────────────────────────

export interface FormState<T extends Record<string, unknown>> {
    form: T;
    errors: Record<string, string>;
    mode: FormMode;
    externalDirty: boolean;
    isSubmitting: boolean;
    submitHandler: ((data: T) => void | Promise<void>) | null;
    deleteHandler: (() => void | Promise<void>) | null;
    validationHandler: ((data: T) => Record<string, string> | null) | null;
}

// ─── Public store handle ──────────────────────────────────────────────────────

export interface FormStore<T extends Record<string, unknown>> {
    getState: () => FormState<T>;
    setState: (partial: Partial<FormState<T>>) => void;
    subscribe: (listener: () => void) => () => void;
    set: (key: keyof T) => (value: string) => void;
    setMode: (mode: FormMode) => void;
    resetForm: () => void;
    validate: () => boolean;
    readonly hasChanges: boolean;
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createFormStore<T extends Record<string, unknown>>(config: {
    schema: z.ZodObject<z.ZodRawShape>;
    originalData?: T | null;
    initialMode?: FormMode;
}): FormStore<T> {
    const { schema, originalData = null, initialMode = "view" } = config;

    function buildEmpty(): T {
        const shape = schema.shape;
        const out: Record<string, unknown> = {};
        for (const key of Object.keys(shape)) {
            const field = shape[key];
            if (field instanceof z.ZodDefault) {
                out[key] = field.def.defaultValue();
            } else if (field instanceof z.ZodString) {
                out[key] = "";
            } else if (field instanceof z.ZodNumber) {
                out[key] = 0;
            } else if (field instanceof z.ZodBoolean) {
                out[key] = false;
            } else {
                out[key] = undefined;
            }
        }
        return out as T;
    }

    let state: FormState<T> = {
        form: originalData ? ({ ...originalData } as T) : buildEmpty(),
        errors: {},
        mode: initialMode,
        externalDirty: false,
        isSubmitting: false,
        submitHandler: null,
        deleteHandler: null,
        validationHandler: null,
    };

    const listeners = new Set<() => void>();
    const notify = () => {
        for (const fn of listeners) fn();
    };

    const getState = () => state;

    const setState = (partial: Partial<FormState<T>>) => {
        state = { ...state, ...partial };
        notify();
    };

    const set = (key: keyof T) => (value: string) => {
        setState({ form: { ...state.form, [key]: value } });
    };

    const setMode = (mode: FormMode) => {
        const next: Partial<FormState<T>> = { mode };
        if (mode === "view") {
            if (originalData) next.form = { ...originalData } as T;
            next.errors = {};
            next.externalDirty = false;
        }
        setState(next);
    };

    const resetForm = () => {
        const next: Partial<FormState<T>> = {
            errors: {},
            externalDirty: false,
        };
        if (originalData) next.form = { ...originalData } as T;
        setState(next);
    };

    const validate = (): boolean => {
        const cur = state;
        if (cur.validationHandler) {
            const result = cur.validationHandler(cur.form);
            if (result) {
                setState({ errors: result });
                return false;
            }
            setState({ errors: {} });
            return true;
        }
        const result = schema.safeParse(cur.form);
        if (result.success) {
            setState({ errors: {} });
            return true;
        }
        const newErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
            const key = issue.path[0] as string;
            if (!newErrors[key]) newErrors[key] = issue.message;
        }
        setState({ errors: newErrors });
        return false;
    };

    const subscribe = (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    };

    return {
        getState,
        setState,
        subscribe,
        set,
        setMode,
        resetForm,
        validate,
        get hasChanges() {
            if (!originalData) return state.externalDirty;
            const orig = originalData as Record<string, unknown>;
            const cur = state.form as Record<string, unknown>;
            return (
                Object.keys(orig).some((k) => {
                    const o = orig[k],
                        c = cur[k];
                    if (typeof o === "string" && typeof c === "string")
                        return o !== c;
                    if (typeof o === "number" && typeof c === "number")
                        return o !== c;
                    if (k === "password" || k === "password_confirmation")
                        return c !== "" && c !== undefined && c !== null;
                    return o !== c;
                }) || state.externalDirty
            );
        },
    };
}

// ─── React hook (subscribes to store with selector) ───────────────────────────

export function useForm<T extends Record<string, unknown>, R>(
    store: FormStore<T>,
    selector: (s: FormState<T>) => R,
): R {
    return useSyncExternalStore(store.subscribe, () =>
        selector(store.getState()),
    ) as R;
}
