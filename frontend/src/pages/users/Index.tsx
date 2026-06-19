// pages/users/Index.tsx
import { useState, useMemo } from "react";
import { Plus, Search, Users2, RefreshCw } from "lucide-react";
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
import { useUsers, useDeleteUser } from "@/hooks/useUsers";
import { cn } from "@/lib/utils";

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({
    label,
    value,
    sub,
    loading,
}: {
    label: string;
    value: number | string;
    sub?: string;
    loading?: boolean;
}) {
    if (loading) {
        return (
            <div className="bg-card border border-border rounded-lg px-4 py-3 animate-pulse">
                <div className="h-2.5 w-16 bg-muted rounded mb-2" />
                <div className="h-7 w-10 bg-muted rounded" />
            </div>
        );
    }
    return (
        <div className="bg-card border border-border rounded-lg px-4 py-3">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-0.5">
                {label}
            </p>
            <p className="text-2xl font-semibold text-foreground">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
        </div>
    );
}

// ─── Filter tabs ──────────────────────────────────────────────────────────────

type FilterTab = "all" | "active" | "inactive" | "Admin" | "SecOps";

const TABS: { label: string; value: FilterTab }[] = [
    { label: "All",      value: "all" },
    { label: "Active",   value: "active" },
    { label: "Inactive", value: "inactive" },
    { label: "Admin",    value: "Admin" },
    { label: "SecOps",  value: "SecOps" },
];

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
                u.role?.role_name === filter;
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
    const adminCount    = users.filter((u) => u.role?.role_name === "Admin").length;

    return (
        <div className="flex flex-col gap-5">
            {/* ── Header ── */}
            <div>
                <h1 className="text-xl font-semibold text-foreground">User Management</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                    Manage accounts and assign roles.
                </p>
            </div>

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
                    <div className="flex gap-1 flex-wrap">
                        {TABS.map((t) => (
                            <button
                                key={t.value}
                                onClick={() => setFilter(t.value)}
                                className={cn(
                                    "px-3 py-1.5 text-xs rounded-full border transition-colors",
                                    filter === t.value
                                        ? "bg-foreground text-background border-foreground"
                                        : "bg-transparent text-muted-foreground border-border hover:bg-muted",
                                )}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>

                <Button
                    icon={<Plus size={15} />}
                    label="Add user"
                    onClick={() => navigate("/users/create")}
                />
            </div>

            {/* ── Stats ── */}
            <div className="grid grid-cols-4 gap-3">
                <StatCard label="Total users"  value={users.length} loading={isLoading} />
                <StatCard
                    label="Active"
                    value={activeCount}
                    sub={users.length ? `${Math.round((activeCount / users.length) * 100)}% of total` : undefined}
                    loading={isLoading}
                />
                <StatCard label="Inactive" value={inactiveCount} loading={isLoading} />
                <StatCard label="Admins" value={adminCount} sub="SecOps below admin" loading={isLoading} />
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
                            role={u.role?.role_name === "Admin" ? "Admin" : "SecOps"}
                            imageUrl={u.avatar}
                            status={u.status}
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
        </div>
    );
};

export default Users;
