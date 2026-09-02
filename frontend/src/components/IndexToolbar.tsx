import {
    ChevronDown,
    Filter,
    Plus,
    ArrowDownWideNarrow,
    ArrowUpWideNarrow,
    ArrowUpDown,
    Landmark,
    X,
} from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { DebouncedSearchInput } from "@/components/DebouncedSearchInput";
import { cn } from "@/lib/utils";

export interface FilterOption {
    label: string;
    value: string;
    count?: number;
    icon?: React.ReactNode;
}

export interface SortOption {
    label: string;
    value: string;
}

interface IndexToolbarProps {
    searchParamName?: string;
    searchPlaceholder?: string;
    searchDebounceMs?: number;

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

    onViewByClient?: () => void;
    viewByClientLabel?: string;
    isViewByClientActive?: boolean;
    onClearViewByClient?: () => void;
}

function IndexToolbar({
    searchParamName = "q",
    searchPlaceholder = "Search…",
    searchDebounceMs = 0,

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

    onViewByClient,
    viewByClientLabel = "View by Client",
    isViewByClientActive = false,
    onClearViewByClient,
}: IndexToolbarProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sticky -top-8 z-10 bg-background pt-8 sm:pt-9 pb-3 -mt-8 pr-12 md:pr-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
                <DebouncedSearchInput
                    paramName={searchParamName}
                    placeholder={searchPlaceholder}
                    debounceMs={searchDebounceMs}
                    className="w-full sm:w-64 shrink-0"
                />

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                    <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            icon={<Filter size={14} />}
                            className="gap-1 cursor-pointer shrink-0 text-xs sm:text-sm h-8"
                        >
                            <span className="flex items-center gap-1 sm:gap-1.5 max-w-35 sm:max-w-none truncate">
                                <span className="truncate">{filterLabel}</span>
                                <span className="text-muted-foreground">·</span>
                                <span className="font-normal truncate">
                                    {sortLabel}
                                </span>
                                {sortDir === "desc" ? (
                                    <ArrowDownWideNarrow
                                        size={12}
                                        className="text-muted-foreground"
                                    />
                                ) : (
                                    <ArrowUpWideNarrow
                                        size={12}
                                        className="text-muted-foreground"
                                    />
                                )}
                            </span>
                            <ChevronDown size={14} />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-56 p-2 ">
                        {/* Filter section */}
                        <div className="flex flex-col gap-2">
                            <div className="flex items-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1 ">
                                Filter
                            </div>
                            <div>
                                {filterOptions.map((option) => (
                                    <label
                                        key={option.value}
                                        className="flex items-center justify-between w-full px-2 py-1 rounded-md text-sm transition-colors cursor-pointer hover:bg-muted text-foreground"
                                    >
                                        <span className="flex items-center gap-1.5 ">
                                            <input
                                                type="radio"
                                                name="filter"
                                                value={option.value}
                                                checked={
                                                    filter === option.value
                                                }
                                                onChange={() =>
                                                    onFilterChange(option.value)
                                                }
                                                className="h-3.5 w-3.5 accent-black cursor-pointer bg-background border-foreground"
                                            />
                                            {option.icon}
                                            {option.label}
                                        </span>
                                        <span className="text-xs text-muted-foreground">
                                            {option.count !== undefined ? option.count : null}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </div>

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
                                    "flex items-center gap-1 text-xs cursor-pointer font-medium rounded-md px-1.5 py-0.5 transition-colors",
                                    sortDir === "desc"
                                        ? "text-primary"
                                        : "text-muted-foreground hover:text-foreground",
                                )}
                            >
                                <ArrowUpDown size={12} />
                                {sortDir === "desc" ? "desc" : "asc"}
                            </button>
                        </div>
                        <div>
                            {sortOptions.map((option) => (
                                <label
                                    key={option.value}
                                    className="flex items-center gap-1.5 w-full px-2 py-1 rounded-md text-sm transition-colors cursor-pointer hover:bg-muted text-foreground"
                                >
                                    <input
                                        type="radio"
                                        name="sort"
                                        value={option.value}
                                        checked={sortField === option.value}
                                        onChange={() =>
                                            onSortFieldChange(option.value)
                                        }
                                        className="h-3.5 w-3.5 accent-black cursor-pointer bg-background border-foreground"
                                    />
                                    {option.label}
                                </label>
                            ))}
                        </div>
                    </PopoverContent>
                </Popover>

                {onViewByClient && (
                    <div className="flex items-center shrink-0">
                        <Button
                            variant={isViewByClientActive ? "default" : "outline"}
                            size="sm"
                            icon={<Landmark size={14} />}
                            label={viewByClientLabel}
                            className={cn(
                                "cursor-pointer transition-colors text-xs sm:text-sm h-8",
                                isViewByClientActive && "bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90",
                                onClearViewByClient &&
                                    "rounded-r-none border-r-0",
                            )}
                            onClick={onViewByClient}
                        />
                        {onClearViewByClient && (
                            <button
                                type="button"
                                onClick={onClearViewByClient}
                                className="h-8 px-2 flex items-center justify-center border border-border rounded-r-lg hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
                                title="Clear client filter"
                            >
                                <X size={13} />
                            </button>
                        )}
                    </div>
                )}
                </div>
            </div>

            {onCreate && (
                <Button
                    size="sm"
                    className="w-full sm:w-auto cursor-pointer shrink-0 text-xs sm:text-sm h-8 bg-primary text-primary-foreground"
                    icon={<Plus size={15} />}
                    label={createLabel}
                    onClick={onCreate}
                />
            )}
        </div>
    );
}

export default IndexToolbar;
