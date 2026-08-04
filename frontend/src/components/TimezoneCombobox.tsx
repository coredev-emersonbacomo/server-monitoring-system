import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

export const TIMEZONE_OPTIONS = Intl.supportedValuesOf("timeZone");

export function tzOffsetLabel(timeZone: string): string {
    try {
        const part = new Intl.DateTimeFormat("en-US", {
            timeZone,
            timeZoneName: "shortOffset",
        })
            .formatToParts(new Date())
            .find((p) => p.type === "timeZoneName");
        const raw = part?.value ?? "";
        const m = raw.match(/^GMT([+-])(\d{2}):?(\d{2})?$/);
        if (!m) return raw;
        const hh = Number(m[2]);
        const mm = m[3] ? Number(m[3]) : 0;
        return `GMT${m[1]}${hh}${mm ? `:${String(mm).padStart(2, "0")}` : ""}`;
    } catch {
        return "";
    }
}

export function TimezoneCombobox({
    value,
    onValueChange,
    placeholder = "Select timezone",
    className,
}: {
    value: string;
    onValueChange: (tz: string) => void;
    placeholder?: string;
    className?: string;
}) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");

    const options = useMemo(() => {
        const list = TIMEZONE_OPTIONS.map((tz) => ({
            value: tz,
            offset: tzOffsetLabel(tz),
        }));
        const q = query.trim().toLowerCase();
        if (!q) return list;
        const digits = q.replace(/^gmt/, "").replace(/[:+ ]/g, "").trim();
        return list.filter(
            (o) =>
                o.value.toLowerCase().includes(q) ||
                o.offset.toLowerCase().includes(q) ||
                (digits &&
                    o.offset.replace(/[:+ ]/g, "").toLowerCase().includes(digits)),
        );
    }, [query]);

    const selectedOffset = value ? tzOffsetLabel(value) : "";

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between font-normal text-foreground",
                        !value && "text-muted-foreground",
                        className,
                    )}
                >
                    <span className="truncate">
                        {value ? `${value} (${selectedOffset})` : placeholder}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="p-0 max-w-none min-w-72"
                style={{ width: "var(--radix-popover-trigger-width)" }}
            >
                <div className="flex items-center gap-2 border-b border-border px-3">
                    <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <input
                        autoFocus
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search timezone or GMT offset…"
                        className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                </div>
                <div className="max-h-72 overflow-y-auto p-1">
                    {options.length === 0 && (
                        <p className="py-6 text-center text-sm text-muted-foreground">
                            No timezone found.
                        </p>
                    )}
                    {options.map((o) => (
                        <button
                            key={o.value}
                            type="button"
                            onClick={() => {
                                onValueChange(o.value);
                                setOpen(false);
                                setQuery("");
                            }}
                            className={cn(
                                "flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent cursor-pointer",
                                value === o.value && "bg-accent text-accent-foreground",
                            )}
                        >
                            <span className="truncate">{o.value}</span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                                {o.offset}
                            </span>
                            {value === o.value && (
                                <Check className="h-4 w-4 shrink-0" />
                            )}
                        </button>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    );
}
