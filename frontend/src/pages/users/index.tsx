// pages/users/index.tsx
import { useState, useMemo } from "react";
import { Users2, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import ProfileCard from "@/components/ProfileCard";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/PageLayout";
import { ConfirmDeleteDialog } from "@/components/ConfirmDeleteDialog";
import { useUsers, useDeleteUser } from "@/hooks/useUsers";
import { useUrlState } from "@/hooks/useUrlState";
import IndexToolbar from "@/components/IndexToolbar";
import type { FilterOption, SortOption } from "@/components/IndexToolbar";
import IndexHeader from "@/components/IndexHeader";

type FilterTab = "all" | "active" | "archived" | "deleted";

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
    useDocumentTitle("Users");
    const navigate = useNavigate();
    const [s, setS] = useUrlState({
        q: { default: "" },
        filter: { default: "all" as FilterTab },
        sort: { default: "created_at" },
        dir: { default: "desc" as "asc" | "desc" },
    });
    const { data: response, isLoading, isError, refetch } = useUsers({
        q: s.q || undefined,
        filter: s.filter,
        sort: s.sort,
        dir: s.dir,
    });
    const users = useMemo(() => response?.data ?? [], [response]);
    const deleteUser = useDeleteUser();

    const [deleteTarget, setDeleteTarget] = useState<{
        uuid: string;
        name: string;
    } | null>(null);

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

    const filterOptions = [
        { label: "All", value: "all" as FilterTab, count: 0 },
        { label: "Active", value: "active" as FilterTab, count: 0 },
        { label: "Archived", value: "archived" as FilterTab, count: 0 },
    ];

    const sortOptions = [
        { label: "Created At", value: "created_at" },
        { label: "Name", value: "name" },
        { label: "Email", value: "email" },
        { label: "Username", value: "username" },
    ];

    const currentFilterLabel =
        filterOptions.find((o) => o.value === s.filter)?.label ?? "All";
    const currentSortLabel =
        sortOptions.find((o) => o.value === s.sort)?.label ?? "";

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
                    searchParamName="q"
                    searchDebounceMs={300}
                    searchPlaceholder="Search users…"
                    filterOptions={filterOptions as FilterOption[]}
                    filter={s.filter}
                    onFilterChange={(v) => setS({ filter: v as FilterTab })}
                    filterLabel={currentFilterLabel}
                    sortOptions={sortOptions as SortOption[]}
                    sortField={s.sort}
                    onSortFieldChange={(v) => setS({ sort: v })}
                    sortDir={s.dir}
                    onSortDirChange={() =>
                        setS({ dir: s.dir === "desc" ? "asc" : "desc" })
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
                        {users.length} user{users.length !== 1 ? "s" : ""}
                    </p>
                )}

                {/* ── Loading skeleton ── */}
                {isLoading && <SkeletonGrid />}

                {/* ── Empty state ── */}
                {!isLoading && !isError && users.length === 0 && (
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
                {!isLoading && !isError && users.length > 0 && (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
                        {users.map((u) => (
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
                <ConfirmDeleteDialog
                    open={!!deleteTarget}
                    onOpenChange={(open) => {
                        if (!open) {
                            setDeleteTarget(null);
                        }
                    }}
                    title="Remove User"
                    resourceName={deleteTarget?.name ?? ""}
                    confirmLabel="Remove"
                    description={
                        <>
                            Are you sure you want to permanently delete{" "}
                            <strong className="text-foreground">
                                {deleteTarget?.name}
                            </strong>
                            ? This action cannot be undone.
                        </>
                    }
                    onConfirm={confirmDelete}
                    isPending={deleteUser.isPending}
                />
            </main>
        </PageLayout>
    );
};

export default Users;
