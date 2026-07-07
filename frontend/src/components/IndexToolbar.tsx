import { ChevronDown, Filter, Plus, Search, ArrowDownWideNarrow, ArrowUpWideNarrow, ArrowUpDown } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterOption {
    label: string;
    value: string;
    count: number;
    icon?: React.ReactNode;
}

export interface SortOption {
    label: string;
    value: string;
}

interface IndexToolbarProps {
    search?: string;
    onSearchChange?: (value: string) => void;
    searchPlaceholder?: string;

    filterOptions: FilterOption[];
    filter: string;
    onFilterChange: (value: string) => void;
    filterLabel: string;

    sortOptions: SortOption[];
    sortField: string;
    onSortFieldChange: (value: string) => void;
    sortDir: "asc" | "desc";
    onSortDirChange: () => void;
    sortLabel: string;

    onCreate?: () => void;
    createLabel?: string;
}

function IndexToolbar({
    search,
    onSearchChange,
    searchPlaceholder = "Search…",

    filterOptions,
    filter,
    onFilterChange,
    filterLabel,

    sortOptions,
    sortField,
    onSortFieldChange,
    sortDir,
    onSortDirChange,
    sortLabel,

    onCreate,
    createLabel,
}: IndexToolbarProps) {
    return (
        <div className="flex items-center justify-between gap-3 flex-wrap sticky top-0 z-10 bg-background pt-9 pb-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
                {onSearchChange && (
                    <div className="relative flex-1 max-w-xs">
                        <Search
                            size={14}
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                        />
                        <input
                            type="text"
                            placeholder={searchPlaceholder}
                            value={search ?? ""}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-8 pr-3 py-2 h-9 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground transition-colors"
                        />
                    </div>
                )}

                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            icon={<Filter size={14} />}
                            className="gap-1 cursor-pointer"
                        >
                            <span className="flex items-center gap-1.5  ">
                                {filterLabel}
                                <span className="text-muted-foreground">·</span>
                                <span className="font-normal">{sortLabel}</span>
                                {sortDir === "desc"
                                    ? <ArrowDownWideNarrow size={12} className="text-muted-foreground" />
                                    : <ArrowUpWideNarrow size={12} className="text-muted-foreground" />}
                            </span>
                            <ChevronDown size={14} />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-56 p-2 space-y-2">
                        {/* Filter section */}
                        <div className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">
                            Filter
                        </div>
                        {filterOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => onFilterChange(option.value)}
                                className={cn(
                                    "flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
                                    filter === option.value
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-muted text-foreground",
                                )}
                            >
                                <span className="flex items-center gap-1.5">
                                    {option.icon}
                                    {option.label}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {option.count}
                                </span>
                            </button>
                        ))}

                        <div className="h-px bg-border" />

                        {/* Sort section */}
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Sort
                            </span>
                            <button
                                type="button"
                                onClick={onSortDirChange}
                                className={cn(
                                    "flex items-center gap-1 text-xs font-medium rounded-md px-1.5 py-0.5 transition-colors cursor-pointer",
                                    sortDir === "desc"
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                <ArrowUpDown size={12} />
                                {sortDir === "desc" ? "desc" : "asc"}
                            </button>
                        </div>
                        {sortOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => onSortFieldChange(option.value)}
                                className={cn(
                                    "flex items-center w-full px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
                                    sortField === option.value
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-muted text-foreground",
                                )}
                            >
                                {option.label}
                            </button>
                        ))}
                    </PopoverContent>
                </Popover>
            </div>

            {onCreate && (
                <Button
                    className="cursor-pointer"
                    icon={<Plus size={15} />}
                    label={createLabel}
                    onClick={onCreate}
                />
            )}
        </div>
    );
}

export default IndexToolbar;
