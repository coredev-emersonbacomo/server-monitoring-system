// File Path: frontend/src/hooks/useFormattedNumberInput.ts

import { useRef, useCallback } from "react";

/**
 * Provides live comma-formatted number input behavior.
 * Keeps the underlying value as raw digits (+ optional decimal),
 * displays it comma-formatted, and preserves cursor position
 * relative to the digits typed (not the raw character index).
 */
export function useFormattedNumberInput() {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const formatValue = useCallback((raw: string): string => {
        if (!raw) return "";

        const cleaned = raw.replace(/[^\d.]/g, "");
        const [intPart, ...rest] = cleaned.split(".");
        const decimalPart = rest.length ? rest.join("") : undefined;

        const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

        return decimalPart !== undefined
            ? `${formattedInt}.${decimalPart}`
            : formattedInt + (cleaned.endsWith(".") ? "." : "");
    }, []);

    const unformat = useCallback((formatted: string): string => {
        return formatted.replace(/,/g, "");
    }, []);

    const handleChange = useCallback(
        (
            rawInputValue: string,
            cursorPos: number,
            onValueChange: (unformatted: string) => void,
        ) => {
            const digitsBeforeCursor = rawInputValue
                .slice(0, cursorPos)
                .replace(/[^\d.]/g, "").length;

            const unformatted = unformat(rawInputValue).replace(/[^\d.]/g, "");
            const formatted = formatValue(unformatted);

            onValueChange(unformatted);

            requestAnimationFrame(() => {
                const el = inputRef.current;
                if (!el) return;

                let seen = 0;
                let pos = 0;
                for (let i = 0; i < formatted.length; i++) {
                    if (/\d|\./.test(formatted[i])) seen++;
                    if (seen >= digitsBeforeCursor) {
                        pos = i + 1;
                        break;
                    }
                    pos = i + 1;
                }
                el.setSelectionRange(pos, pos);
            });

            return formatted;
        },
        [formatValue, unformat],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            const allowedKeys = [
                "Backspace", "Delete", "Tab", "Escape", "Enter",
                "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown",
                "Home", "End",
            ];

            if (
                allowedKeys.includes(e.key) ||
                ((e.ctrlKey || e.metaKey) && ["a", "c", "v", "x"].includes(e.key.toLowerCase()))
            ) {
                return;
            }

            if (e.key === "." && !e.currentTarget.value.includes(".")) {
                return;
            }

            if (!/^\d$/.test(e.key)) {
                e.preventDefault();
            }
        },
        [],
    );

    const handlePaste = useCallback(
        (e: React.ClipboardEvent<HTMLInputElement>) => {
            const pasted = e.clipboardData.getData("text");
            if (/[^\d.,]/.test(pasted)) {
                e.preventDefault();
            }
        },
        [],
    );

    return {
        inputRef,
        formatValue,
        unformat,
        handleChange,
        handleKeyDown,
        handlePaste,
    };
}