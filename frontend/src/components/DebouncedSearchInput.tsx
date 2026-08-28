import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Search input wired directly to a URL search param. Buffers keystrokes in
 * local state and pushes the value to the URL after `debounceMs` of
 * inactivity (or immediately when `debounceMs <= 0`). Clears other keys from
 * the param list on write so a stale value never lingers.
 */
export function DebouncedSearchInput({
    paramName,
    debounceMs = 0,
    placeholder,
    className,
}: {
    paramName: string;
    debounceMs?: number;
    placeholder: string;
    className?: string;
}) {
    const [searchParams, setSearchParams] = useSearchParams();
    const urlValue = searchParams.get(paramName) ?? "";
    const [local, setLocal] = useState(urlValue);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastEmitted = useRef(urlValue);

    // Sync from URL when it changes externally (clear button, navigation, etc.)
    useEffect(() => {
        setLocal(urlValue);
        lastEmitted.current = urlValue;
    }, [urlValue]);

    useEffect(
        () => () => {
            if (timer.current) clearTimeout(timer.current);
        },
        [],
    );

    const push = useCallback(
        (next: string) => {
            const params = new URLSearchParams(searchParams);
            if (next) {
                params.set(paramName, next);
            } else {
                params.delete(paramName);
            }
            // Reset to page 1 on a search change unless caller already managed it.
            if (params.get("page") && params.get("page") !== "1") {
                params.delete("page");
            }
            setSearchParams(params, { replace: false });
        },
        [searchParams, setSearchParams, paramName],
    );

    const handleChange = (next: string) => {
        setLocal(next);
        if (timer.current) clearTimeout(timer.current);
        if (next === lastEmitted.current) return;
        if (debounceMs <= 0) {
            lastEmitted.current = next;
            push(next);
            return;
        }
        timer.current = setTimeout(() => {
            lastEmitted.current = next;
            push(next);
        }, debounceMs);
    };

    return (
        <div className={cn("relative flex-1 min-w-35 sm:max-w-xs", className)}>
            <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
            />
            <Input
                type="text"
                placeholder={placeholder}
                value={local}
                onChange={(e) => handleChange(e.target.value)}
                className="pl-8 pr-3"
            />
        </div>
    );
}
