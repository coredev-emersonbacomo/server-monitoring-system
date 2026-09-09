import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

export type UrlStateSchema<T extends Record<string, unknown>> = {
    [K in keyof T]: {
        default: T[K];
        parse?: (raw: string) => T[K];
        serialize?: (value: T[K]) => string;
    };
};

type Defaults<T> = { [K in keyof T]: T[K] };

function isDefaultValue(value: unknown, defaultValue: unknown): boolean {
    if (value === defaultValue) return true;
    if (value === null || value === undefined) return true;
    if (typeof value === "string" && value === "") return true;
    return false;
}

/**
 * URL search params as typed state. Each key has a default; defaults are not
 * stored in the URL, so the URL stays clean.
 *
 *   const [s, setS] = useUrlState({
 *       q:    { default: "" },
 *       page: { default: 1, parse: (v) => Number(v) },
 *       sort: { default: "name" },
 *   });
 *   s.q            // string
 *   setS("q", "x") // updates URL
 *   setS({ q: "x", page: 1 }) // batch update
 */
export function useUrlState<T extends Record<string, unknown>>(
    schema: UrlStateSchema<T>,
) {
    const [searchParams, setSearchParams] = useSearchParams();
    // Latest schema for the stable callbacks below — assigned in an effect,
    // never during render.
    const schemaRef = useRef(schema);
    useEffect(() => {
        schemaRef.current = schema;
    });

    const state = useMemo(() => {
        const result = {} as T;
        for (const key in schema) {
            const raw = searchParams.get(key);
            const def = schema[key];
            if (raw === null) {
                result[key] = def.default;
            } else if (def.parse) {
                result[key] = def.parse(raw);
            } else {
                result[key] = raw as T[typeof key];
            }
        }
        return result;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams]);

    const writeParams = useCallback(
        (next: URLSearchParams) => {
            setSearchParams(next, { replace: false });
        },
        [setSearchParams],
    );

    const setOne = useCallback(
        <K extends keyof T>(key: K, value: T[K]) => {
            const sch = schemaRef.current;
            const def = sch[key];
            const next = new URLSearchParams(searchParams);
            const serialized =
                def.serialize?.(value) ??
                (value === undefined || value === null ? "" : String(value));
            if (isDefaultValue(value, def.default)) {
                next.delete(String(key));
            } else {
                next.set(String(key), serialized);
            }
            writeParams(next);
        },
        [searchParams, writeParams],
    );

    const setMany = useCallback(
        (updates: Partial<T>) => {
            const sch = schemaRef.current;
            const next = new URLSearchParams(searchParams);
            for (const key in updates) {
                const value = updates[key] as T[typeof key];
                const def = sch[key];
                const serialized =
                    def.serialize?.(value) ??
                    (value === undefined || value === null ? "" : String(value));
                if (isDefaultValue(value, def.default)) {
                    next.delete(key);
                } else {
                    next.set(key, serialized);
                }
            }
            writeParams(next);
        },
        [searchParams, writeParams],
    );

    const reset = useCallback(() => {
        const next = new URLSearchParams(searchParams);
        for (const key in schemaRef.current) {
            next.delete(key);
        }
        writeParams(next);
    }, [searchParams, writeParams]);

    const defaults = useMemo(() => {
        const d = {} as Defaults<T>;
        for (const key in schema) {
            d[key] = schema[key].default;
        }
        return d;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return [state, setMany, setOne, reset, defaults] as const;
}
