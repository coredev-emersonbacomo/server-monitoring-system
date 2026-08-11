import { useEffect, useRef, useState } from "react";
import { ChevronDown, CalendarRange } from "lucide-react";

interface RangeOption {
    value: number;
    label: string;
}

interface RangeDropdownProps {
    value: number;
    onChange: (value: number) => void;
    options: RangeOption[];
}

export function RangeDropdown({ value, onChange, options }: RangeDropdownProps) {
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

    const current = options.find((opt) => opt.value === value);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-sidebar-hover"
            >
                <CalendarRange className="w-4 h-4" />
                <span className="hidden sm:inline">Range:</span>
                <span className="font-medium">{current?.label ?? "—"}</span>
                <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {open && (
                <div className="absolute right-0 mt-2 w-48 rounded-xl border border-border bg-background shadow-lg z-40 p-2">
                    {options.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => {
                                onChange(opt.value);
                                setOpen(false);
                            }}
                            className={`w-full text-left px-2 py-1.5 rounded-lg hover:bg-sidebar-hover text-sm ${
                                opt.value === value
                                    ? "font-semibold text-primary"
                                    : "text-foreground"
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
