import { useEffect, useRef, useState } from "react";
import { ChevronDown, ListFilter } from "lucide-react";

export interface FilterOption {
    value: string;
    label: string;
}

interface FilterDropdownProps {
    options: FilterOption[];
    selected: string[];
    onChange: (selected: string[]) => void;
    label?: string;
}

export function FilterDropdown({ options, selected, onChange, label = "Filter" }: FilterDropdownProps) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggle = (value: string) => {
        if (selected.includes(value)) {
            onChange(selected.filter((v) => v !== value));
        } else {
            onChange([...selected, value]);
        }
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm border border-border hover:bg-sidebar-hover"
            >
                <ListFilter className="w-4 h-4" />
                {label}
                {selected.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full bg-primary text-primary-foreground text-xs">
                        {selected.length}
                    </span>
                )}
                <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-border bg-background shadow-lg z-40 p-2">
                    {options.map((opt) => (
                        <label
                            key={opt.value}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-sidebar-hover text-sm cursor-pointer"
                        >
                            <input
                                type="checkbox"
                                checked={selected.includes(opt.value)}
                                onChange={() => toggle(opt.value)}
                                className="accent-primary"
                            />
                            {opt.label}
                        </label>
                    ))}

                    {selected.length > 0 && (
                        <>
                            <div className="h-px bg-border my-1" />
                            <button
                                onClick={() => onChange([])}
                                className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-sidebar-hover text-sm text-muted-foreground"
                            >
                                Clear filters
                            </button>
                        </>
                    )}
                </div>
            )}
        </div>
    );
}