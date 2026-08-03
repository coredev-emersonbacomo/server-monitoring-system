import { useState, useEffect, useRef, useCallback } from 'react';
import { useTemplateAutocomplete } from '../useTemplateAutocomplete';
import { TemplateDropdown } from '../template-dropdown';

interface TemplateInputProps {
    value: string;
    onChange: (value: string) => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    onClick?: (e: React.MouseEvent) => void;
    onPointerDown?: (e: React.PointerEvent) => void;
    className?: string;
    channel?: string;
    rows?: number;
    label?: string;
}

function autoResize(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
}

export function TemplateInput({ value, onChange, onKeyDown, onClick, onPointerDown, className, rows, label }: TemplateInputProps) {
    const [local, setLocal] = useState(value);
    useEffect(() => {
        if (value !== local) setLocal(value);
    }, [value, local]);

    const fieldRef = useRef<HTMLTextAreaElement | null>(null);
    const ac = useTemplateAutocomplete(
        local,
        (v) => {
            onChange(v);
            setLocal(v);
        },
        fieldRef,
        onKeyDown,
    );

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            onChange(e.target.value);
            setLocal(e.target.value);
            ac.handleChange(e);
            if (!rows) autoResize(e.target);
        },
        [ac, onChange, rows],
    );

    const handleFocus = useCallback(
        (e: React.FocusEvent<HTMLTextAreaElement>) => {
            ac.handleFocus(e.currentTarget);
        },
        [ac],
    );

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLTextAreaElement>) => {
            ac.handleClick(e.currentTarget);
            onClick?.(e as unknown as React.MouseEvent);
        },
        [ac, onClick],
    );

    return (
        <div className={`relative ${label ? 'flex flex-col gap-1' : 'flex-1'}`}>
            {label && (
                <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">
                    {label}
                </span>
            )}
            <textarea
                ref={fieldRef}
                value={local}
                onChange={handleChange}
                onKeyDown={ac.handleKeyDown}
                onFocus={handleFocus}
                onBlur={() => setTimeout(() => ac.close(), 50)}
                onClick={handleClick}
                onPointerDown={onPointerDown}
                rows={rows ?? 1}
                className={
                    `w-full resize-none overflow-hidden text-xs text-foreground bg-background border border-input rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring ${className || ''}`
                }
                placeholder="Message template"
                spellCheck={false}
            />
            {ac.showDropdown && (
                <TemplateDropdown
                    filtered={ac.filtered}
                    selectedIndex={ac.selectedIndex}
                    query={ac.query}
                    caret={ac.caret}
                    onSelect={ac.insertVariable}
                    onHover={ac.setSelectedIndex}
                    onClose={ac.close}
                />
            )}
        </div>
    );
}
