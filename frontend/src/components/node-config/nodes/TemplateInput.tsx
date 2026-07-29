import { useState, useRef, useCallback, useEffect, type KeyboardEvent } from 'react';
import { filterVariables, type TemplateVariable } from './templateVariables';

interface TemplateInputProps {
    value: string;
    onChange: (value: string) => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    onClick?: (e: React.MouseEvent) => void;
    onPointerDown?: (e: React.PointerEvent) => void;
    type?: string;
    className?: string;
}

function highlightMatch(text: string, query: string): React.ReactNode {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
        <>
            {text.slice(0, idx)}
            <span className="bg-primary/25 text-primary font-bold rounded-sm px-0.5">{text.slice(idx, idx + query.length)}</span>
            {text.slice(idx + query.length)}
        </>
    );
}

export function TemplateInput({ value, onChange, onKeyDown, onClick, onPointerDown, type = 'text', className }: TemplateInputProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [insertPos, setInsertPos] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    const filtered = filterVariables(query);
    const showDropdown = open && filtered.length > 0;

    const checkForTrigger = useCallback((input: HTMLInputElement) => {
        const pos = input.selectionStart ?? 0;
        const textBefore = input.value.substring(0, pos);
        let lastOpen = textBefore.lastIndexOf('{');
        let isTag = false;

        if (lastOpen === -1) {
            lastOpen = textBefore.lastIndexOf('<');
            if (lastOpen === -1) {
                setOpen(false);
                return;
            }
            isTag = true;
        }

        const closeChar = isTag ? '>' : '}';
        const lastClose = textBefore.lastIndexOf(closeChar);
        if (lastClose > lastOpen) {
            setOpen(false);
            return;
        }
        const segment = textBefore.substring(lastOpen + 1);
        if (segment.includes(closeChar)) {
            setOpen(false);
            return;
        }
        setQuery((isTag ? '<' : '{') + segment);
        setInsertPos(lastOpen);
        setSelectedIndex(0);
        setOpen(true);
    }, []);

    const insertVariable = useCallback((variable: TemplateVariable) => {
        const input = inputRef.current;
        if (!input) return;
        const before = value.substring(0, insertPos);
        const after = input.value.substring(input.selectionStart ?? value.length);
        let newVal: string;
        let cursorOffset: number;
        if (variable.group === 'tag') {
            const tagKey = variable.key;
            const closing = tagKey.startsWith('</') ? '' : `</${tagKey.slice(1)}`;
            const tagContent = tagKey === '<discord-button>'
                ? '<discord-button detailsUrl=""></discord-button>'
                : tagKey + closing;
            newVal = before + tagContent + after;
            cursorOffset = tagKey === '<discord-button>'
                ? insertPos + '<discord-button detailsUrl="'.length
                : insertPos + tagKey.length;
        } else {
            newVal = before + '{' + variable.key + '}' + after;
            cursorOffset = insertPos + variable.key.length + 2;
        }
        onChange(newVal);
        setOpen(false);
        requestAnimationFrame(() => {
            input.focus();
            input.setSelectionRange(cursorOffset, cursorOffset);
        });
    }, [value, insertPos, onChange]);

    const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e.target.value);
        checkForTrigger(e.target);
    }, [onChange, checkForTrigger]);

    const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
        if (showDropdown) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex((i) => (i + 1) % filtered.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                insertVariable(filtered[selectedIndex]);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(false);
                return;
            }
        }
        onKeyDown?.(e);
    }, [showDropdown, filtered, selectedIndex, insertVariable, onKeyDown]);

    useEffect(() => {
        if (showDropdown && listRef.current) {
            const item = listRef.current.children[selectedIndex] as HTMLElement;
            item?.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex, showDropdown]);

    // Native capture-phase wheel listener to block React Flow's zoom
    useEffect(() => {
        if (!showDropdown) return;
        const el = listRef.current;
        if (!el) return;

        const handler = (e: WheelEvent) => {
            e.stopPropagation();
        };
        el.addEventListener('wheel', handler, { capture: true });
        return () => el.removeEventListener('wheel', handler, { capture: true });
    }, [showDropdown]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (inputRef.current && !inputRef.current.contains(e.target as Node) &&
                listRef.current && !listRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative flex-1">
            <input
                ref={inputRef}
                type={type}
                value={value}
                onChange={handleInput}
                onKeyDown={handleKeyDown}
                onFocus={() => inputRef.current && checkForTrigger(inputRef.current)}
                onBlur={() => setTimeout(() => setOpen(false), 50)}
                onClick={onClick}
                onPointerDown={onPointerDown}
                className={`w-full ${className || ''}`}
            />
            {showDropdown && (
                <div
                    ref={listRef}
                    className="absolute z-50 bottom-full left-0 mb-1 w-64 max-h-48 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg"
                >
                    {filtered.map((variable, i) => (
                        <button
                            key={variable.key}
                            type="button"
                            className={`w-full text-left px-3 py-1.5 text-xs flex flex-col gap-0.5 cursor-pointer ${
                                i === selectedIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                            }`}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                insertVariable(variable);
                            }}
                            onMouseEnter={() => setSelectedIndex(i)}
                        >
                            <span className="font-mono text-foreground">
                                {variable.group === 'tag'
                                    ? highlightMatch(variable.key, query)
                                    : <>{'{'}{highlightMatch(variable.key, query)}{'}'}</>}
                            </span>
                            <span className="text-muted-foreground text-[10px]">{variable.description}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
