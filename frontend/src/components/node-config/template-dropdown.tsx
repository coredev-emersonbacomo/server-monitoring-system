import { useEffect, useRef } from 'react';
import type { TemplateVariable } from './templateVariables';
import type { CaretCoords } from './useTemplateAutocomplete';

interface TemplateDropdownProps {
    filtered: TemplateVariable[];
    selectedIndex: number;
    query: string;
    caret: CaretCoords | null;
    onSelect: (v: TemplateVariable) => void;
    onHover: (i: number) => void;
    onClose: () => void;
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

export function TemplateDropdown({
    filtered,
    selectedIndex,
    query,
    caret,
    onSelect,
    onHover,
    onClose,
}: TemplateDropdownProps) {
    const listRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (listRef.current) {
            const item = listRef.current.children[selectedIndex] as HTMLElement | undefined;
            item?.scrollIntoView({ block: 'nearest' });
        }
    }, [selectedIndex]);

    useEffect(() => {
        const el = listRef.current;
        if (!el) return;
        const handler = (e: WheelEvent) => e.stopPropagation();
        el.addEventListener('wheel', handler, { capture: true });
        return () => el.removeEventListener('wheel', handler, { capture: true });
    }, []);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (listRef.current && !listRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose]);

    if (!caret) return null;

    return (
        <div
            ref={listRef}
            style={{ top: caret.top + 6, left: caret.left }}
            className="fixed z-50 w-64 max-h-48 overflow-y-auto bg-popover border border-border rounded-lg shadow-lg"
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
                        onSelect(variable);
                    }}
                    onMouseEnter={() => onHover(i)}
                >
                    <span className="font-mono text-foreground">
                        {(variable.group as string) === 'tag'
                            ? highlightMatch(variable.key, query)
                            : <>{'{'}{highlightMatch(variable.key, query)}{'}'}</>}
                    </span>
                    <span className="text-muted-foreground text-[10px]">{variable.description}</span>
                </button>
            ))}
        </div>
    );
}
