import { Popover, PopoverContent } from "@radix-ui/react-popover";
import { ChevronDown, Filter, Plus, Search } from "lucide-react";
import { type Dispatch, type SetStateAction } from "react";
import { PopoverTrigger } from "./ui/popover";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface FilterOption {
    label: string;
    value: string;
    count: number;
}

interface IndexToolbarProps {
    filterOptions: FilterOption[];
    search: string;
    setSearch: Dispatch<SetStateAction<string>>;
    filter: string;
    setFilter: Dispatch<SetStateAction<string>>;
}

function IndexToolbar({
    filterOptions,
    search,
    setSearch,
    filter,
    setFilter,
}: IndexToolbarProps) {
    const navigate = useNavigate();

    const currentFilterLabel =
        filterOptions.find((o) => o.value === filter)?.label ?? "All";

    return (
        <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="relative flex-1 max-w-xs">
                    <Search
                        size={14}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                    />
                    <input
                        type="text"
                        placeholder="Search users…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground transition-colors"
                    />
                </div>

                <Popover>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            icon={<Filter size={14} />}
                            className="gap-1"
                        >
                            {currentFilterLabel}
                            <ChevronDown size={14} />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-48 p-1">
                        {filterOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setFilter(option.value)}
                                className={cn(
                                    "flex items-center justify-between w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                                    filter === option.value
                                        ? "bg-accent text-accent-foreground"
                                        : "hover:bg-muted text-foreground",
                                )}
                            >
                                <span>{option.label}</span>
                                <span className="text-xs text-muted-foreground">
                                    {option.count}
                                </span>
                            </button>
                        ))}
                    </PopoverContent>
                </Popover>
            </div>

            <Button
                icon={<Plus size={15} />}
                label="Add user"
                onClick={() => navigate("/users/create")}
            />
        </div>
    );
}

export default IndexToolbar;
