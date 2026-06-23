// pages/users/Index.tsx
import { useState, useMemo } from "react";
import { Plus, Search, Users2, RefreshCw, Filter, ChevronDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ProfileCard from "@/components/ProfileCard";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useUsers, useDeleteUser } from "@/hooks/useUsers";
import { cn } from "@/lib/utils";

type FilterTab = "all" | "active" | "inactive" | "Admin" | "SecOps";

// ─── Skeleton grid ────────────────────────────────────────────────────────────

function SkeletonGrid() {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="bg-card border border-border rounded-lg p-6 flex flex-col items-center gap-3 animate-pulse"
                >
                    <div className="w-24 h-24 rounded-full bg-muted" />
                    <div className="h-4 w-28 bg-muted rounded" />
                    <div className="h-3 w-36 bg-muted rounded" />
                    <div className="h-3 w-20 bg-muted rounded" />
                </div>
            ))}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const Users = () => {
    const navigate = useNavigate();
    const { data: users = [], isLoading, isError, refetch } = useUsers();
    const deleteUser = useDeleteUser();

    const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<FilterTab>("all");

    const visible = useMemo(() => {
        const q = search.toLowerCase();
        return users.filter((u) => {
            const matchSearch =
                !q ||
                `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.username.toLowerCase().includes(q);
            const matchFilter =
                filter === "all" ||
                u.status === filter ||
                u.role === filter;
            return matchSearch && matchFilter;
        });
    }, [search, filter, users]);

    const handleDeleteRequest = (id: number) => {
        const user = users.find((u) => u.id === id);
        if (user) setDeleteTarget({ id, name: `${user.first_name} ${user.last_name}` });
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteUser.mutateAsync(deleteTarget.id);
            toast.success(`${deleteTarget.name} has been removed.`);
            setDeleteTarget(null);
        } catch {
            toast.error("Failed to delete user. Please try again.");
        }
    };

    const activeCount   = users.filter((u) => u.status === "active").length;
    const inactiveCount = users.filter((u) => u.status === "inactive").length;
    const adminCount    = users.filter((u) => u.role === "Admin").length;
    const secopsCount   = users.filter((u) => u.role === "SecOps").length;

    const filterOptions = [
        { label: "All",      value: "all" as FilterTab, count: users.length },
        { label: "Active",   value: "active" as FilterTab, count: activeCount },
        { label: "Inactive", value: "inactive" as FilterTab, count: inactiveCount },
        { label: "Admin",    value: "Admin" as FilterTab, count: adminCount },
        { label: "SecOps",   value: "SecOps" as FilterTab, count: secopsCount },
    ];

    const currentFilterLabel = filterOptions.find((o) => o.value === filter)?.label ?? "All";

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
            {/* ── Header ── */}
            <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div>
                    <div className="flex items-start justify-between gap-4 py-3">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                                <Users2 className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-lg font-semibold tracking-tight">
                                    User Management
                                </h1>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Manage accounts and assign roles.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>
            
            <main className="py-6 w-full flex-1 min-h-0 overflow-auto flex flex-col gap-5">

            {/* ── Toolbar ── */}
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
                                    <span className="text-xs text-muted-foreground">{option.count}</span>
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

            {/* ── Error state ── */}
            {isError && (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-foreground">
                    <Users2 size={32} className="opacity-30" />
                    <p className="text-sm">Failed to load users.</p>
                    <Button
                        variant="outline"
                        size="sm"
                        icon={<RefreshCw size={14} />}
                        label="Retry"
                        onClick={() => refetch()}
                    />
                </div>
            )}

            {/* ── Count label ── */}
            {!isLoading && !isError && (
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium">
                    {visible.length} user{visible.length !== 1 ? "s" : ""}
                </p>
            )}

            {/* ── Loading skeleton ── */}
            {isLoading && <SkeletonGrid />}

            {/* ── Empty state ── */}
            {!isLoading && !isError && visible.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                    <Users2 size={40} className="opacity-20" />
                    <p className="text-sm font-medium">No users match your search.</p>
                    <p className="text-xs opacity-60">Try adjusting your filters or search term.</p>
                </div>
            )}

            {/* ── Card grid ── */}
            {!isLoading && !isError && visible.length > 0 && (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                    {visible.map((u) => (
                        <ProfileCard
                            key={u.id}
                            id={u.id}
                            name={`${u.first_name} ${u.last_name}`}
                            email={u.email}
                            role={u.role}
                            imageUrl={u.profile_picture_url}
                            onDelete={handleDeleteRequest}
                        />
                    ))}
                </div>
            )}

            {/* ── Delete dialog ── */}
            <Dialog
                open={!!deleteTarget}
                onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
            >
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>Remove User</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        Are you sure you want to permanently delete{" "}
                        <span className="font-medium text-foreground">{deleteTarget?.name}</span>?
                        This action cannot be undone.
                    </p>
                    <div className="flex justify-end gap-2 pt-2">
                        <DialogClose asChild>
                            <Button variant="outline" label="Cancel" onClick={() => setDeleteTarget(null)} />
                        </DialogClose>
                        <Button
                            variant="danger"
                            label={deleteUser.isPending ? "Removing…" : "Remove"}
                            disabled={deleteUser.isPending}
                            onClick={confirmDelete}
                        />
                    </div>
                </DialogContent>
            </Dialog>
            </main>
        </div>
    );
};

export default Users;
