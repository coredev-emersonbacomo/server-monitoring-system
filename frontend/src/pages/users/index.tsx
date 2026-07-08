// pages/users/index.tsx
import { useState, useMemo } from "react";
import { Users2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import ProfileCard from "@/components/ProfileCard";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/PageLayout";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { useUsers, useDeleteUser } from "@/hooks/useUsers";
import IndexToolbar from "@/components/IndexToolbar";
import type { FilterOption, SortOption } from "@/components/IndexToolbar";
import IndexHeader from "@/components/IndexHeader";

type FilterTab = "all" | "active" | "deleted" | "Admin" | "SecOps";

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

    const [deleteTarget, setDeleteTarget] = useState<{
        uuid: string;
        name: string;
    } | null>(null);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState<FilterTab>("all");
    const [sortField, setSortField] = useState<string>("created_at");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const visible = useMemo(() => {
        const q = search.toLowerCase();
        const filtered = users.filter((u) => {
            const matchSearch =
                !q ||
                `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
                u.email.toLowerCase().includes(q) ||
                u.username.toLowerCase().includes(q);
            const matchFilter = filter === "all" || u.record_status === filter;
            return matchSearch && matchFilter;
        });
        return [...filtered].sort((a, b) => {
            const cmp = (() => {
                switch (sortField) {
                    case "name":
                        return `${a.first_name} ${a.last_name}`.localeCompare(
                            `${b.first_name} ${b.last_name}`,
                        );
                    case "email":
                        return a.email.localeCompare(b.email);
                    case "username":
                        return a.username.localeCompare(b.username);
                    default:
                        return a.created_at.localeCompare(b.created_at);
                }
            })();
            return sortDir === "desc" ? -cmp : cmp;
        });
    }, [search, filter, sortField, sortDir, users]);

    const handleDeleteRequest = (uuid: string) => {
        const user = users.find((u) => u.uuid === uuid);
        if (user)
            setDeleteTarget({
                uuid,
                name: `${user.first_name} ${user.last_name}`,
            });
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        try {
            await deleteUser.mutateAsync(deleteTarget.uuid);
            toast.success(`${deleteTarget.name} has been removed.`);
            setDeleteTarget(null);
        } catch {
            toast.error("Failed to delete user. Please try again.");
        }
    };

    const activeCount = users.filter(
        (u) => u.record_status === "active",
    ).length;
    const inactiveCount = users.filter(
        (u) => u.record_status === "deleted",
    ).length;

    const filterOptions = [
        { label: "All", value: "all" as FilterTab, count: users.length },
        { label: "Active", value: "active" as FilterTab, count: activeCount },
        {
            label: "Deleted",
            value: "deleted" as FilterTab,
            count: inactiveCount,
        },
    ];

    const sortOptions = [
        { label: "Created At", value: "created_at" },
        { label: "Name", value: "name" },
        { label: "Email", value: "email" },
        { label: "Username", value: "username" },
    ];

    const currentFilterLabel =
        filterOptions.find((o) => o.value === filter)?.label ?? "All";
    const currentSortLabel =
        sortOptions.find((o) => o.value === sortField)?.label ?? "";

    return (
        <PageLayout>
            <IndexHeader
                icon={Users2}
                title="User Management"
                description="Manage accounts and assign roles."
            />

            <main className="w-full flex-1 min-h-0 flex flex-col gap-5">
                {/* ── Toolbar ── */}
                <IndexToolbar
                    search={search}
                    onSearchChange={setSearch}
                    searchPlaceholder="Search users…"
                    filterOptions={filterOptions as FilterOption[]}
                    filter={filter}
                    onFilterChange={(v) => setFilter(v as FilterTab)}
                    filterLabel={currentFilterLabel}
                    sortOptions={sortOptions as SortOption[]}
                    sortField={sortField}
                    onSortFieldChange={setSortField}
                    sortDir={sortDir}
                    onSortDirChange={() =>
                        setSortDir((d) => (d === "desc" ? "asc" : "desc"))
                    }
                    sortLabel={currentSortLabel}
                    onCreate={() => navigate("/users/create")}
                    createLabel="Add user"
                />

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
                        <p className="text-sm font-medium">
                            No users match your search.
                        </p>
                        <p className="text-xs opacity-60">
                            Try adjusting your filters or search term.
                        </p>
                    </div>
                )}

                {/* ── Card grid ── */}
                {!isLoading && !isError && visible.length > 0 && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                        {visible.map((u) => (
                            <ProfileCard
                                key={u.uuid}
                                uuid={u.uuid}
                                name={`${u.first_name} ${u.last_name}`}
                                email={u.email}
                                phone_number={u.phone_number}
                                imageUrl={u.profile_picture_url}
                                onDelete={handleDeleteRequest}
                            />
                        ))}
                    </div>
                )}

                {/* ── Delete dialog ── */}
                <Dialog
                    open={!!deleteTarget}
                    onOpenChange={(open) => {
                        if (!open) setDeleteTarget(null);
                    }}
                >
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Remove User</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                            Are you sure you want to permanently delete{" "}
                            <span className="font-medium text-foreground">
                                {deleteTarget?.name}
                            </span>
                            ? This action cannot be undone.
                        </p>
                        <div className="flex justify-end gap-2 pt-2">
                            <DialogClose asChild>
                                <Button
                                    className="cursor-pointer"
                                    variant="outline"
                                    label="Cancel"
                                    onClick={() => setDeleteTarget(null)}
                                />
                            </DialogClose>
                            <Button
                                className="cursor-pointer"
                                variant="danger"
                                label={
                                    deleteUser.isPending
                                        ? "Removing…"
                                        : "Remove"
                                }
                                disabled={deleteUser.isPending}
                                onClick={confirmDelete}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </main>
        </PageLayout>
    );
};

export default Users;
