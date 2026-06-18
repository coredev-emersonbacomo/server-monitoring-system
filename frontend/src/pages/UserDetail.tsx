import { useState, useEffect } from "react";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import {
    ArrowLeft,
    Pencil,
    Upload,
    AlertTriangle,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
    useUser,
    useCreateUser,
    useUpdateUser,
    useDeleteUser,
} from "@/hooks/useUsers";

// ─── Form skeleton ────────────────────────────────────────────────────────────

function FormSkeleton() {
    return (
        <div className="bg-card border border-border/60 rounded-xl shadow-sm p-6 sm:p-8 flex flex-col gap-6 animate-pulse">
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-muted shrink-0" />
                <div className="h-8 w-28 bg-muted rounded-lg" />
            </div>
            <div className="h-px bg-border" />
            {[0, 1, 2].map((i) => (
                <div key={i} className="grid grid-cols-2 gap-4">
                    <div className="h-9 bg-muted rounded-md" />
                    <div className="h-9 bg-muted rounded-md" />
                </div>
            ))}
        </div>
    );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
    label,
    required,
    children,
    hint,
    error,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
    hint?: string;
    error?: string;
}) {
    return (
        <div className="flex flex-col gap-1">
            <Label>
                {label}
                {required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            {children}
            {hint && (
                <p className="text-[11px] text-muted-foreground">{hint}</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserDetail() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { setTrail } = useBreadcrumb();
    const isCreate = !id;
    const userId = id ? Number(id) : 0;

    // ── Data fetching ──────────────────────────────────────────────────────────
    const {
        data: userRecord,
        isLoading: userLoading,
        isError: userError,
    } = useUser(userId);

    // ── Mutations ──────────────────────────────────────────────────────────────
    const createUser = useCreateUser();
    const updateUser = useUpdateUser(userId);
    const deleteUser = useDeleteUser();

    // ── Local state ────────────────────────────────────────────────────────────
    const [isEditing, setIsEditing] = useState(isCreate);
    const [showDelete, setShowDelete] = useState(false);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
        username: "",
        role_id: 2,
        status: "active" as "active" | "inactive",
        password: "",
        password_confirmation: "",
    });

    // Populate form when user data arrives
    useEffect(() => {
        if (userRecord) {
            setForm({
                first_name: userRecord.first_name,
                last_name: userRecord.last_name,
                email: userRecord.email,
                username: userRecord.username,
                role_id: userRecord.role_id,
                status: userRecord.status ?? "active",
                password: "",
                password_confirmation: "",
            });
        }
    }, [userRecord]);

    // Breadcrumb
    useEffect(() => {
        if (isCreate) {
            setTrail([
                { label: "Users", href: "/users" },
                { label: "Create", href: "/users/create" },
            ]);
        } else if (userRecord) {
            setTrail([
                { label: "Users", href: "/users" },
                {
                    label: `${userRecord.first_name} ${userRecord.last_name}`,
                    href: `/users/${userId}`,
                },
            ]);
        }
    }, [setTrail, isCreate, userRecord, userId]);

    const set =
        (key: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
            setForm((f) => ({ ...f, [key]: e.target.value }));

    const validate = (): boolean => {
        const schema = z.object({
            first_name: z.string().trim().min(1, "Required"),
            last_name: z.string().trim().min(1, "Required"),
            email: z.string().trim().min(1, "Required").email("Invalid email"),
            username: z.string().trim().min(1, "Required"),
            password: z.string().superRefine((val, ctx) => {
                if (isCreate && !val) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Required" });
                else if (val && val.length < 8) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Minimum 8 characters" });
            }),
            password_confirmation: z.string()
        }).superRefine((data, ctx) => {
            if (data.password && data.password !== data.password_confirmation) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["password_confirmation"], message: "Passwords do not match" });
            }
        });

        const result = schema.safeParse(form);
        if (result.success) {
            setErrors({});
            return true;
        }

        const newErrors: Record<string, string> = {};
        for (const issue of result.error.issues) {
            const key = issue.path[0] as string;
            if (!newErrors[key]) newErrors[key] = issue.message;
        }
        setErrors(newErrors);
        return false;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            if (isCreate) {
                await createUser.mutateAsync({
                    first_name: form.first_name,
                    last_name: form.last_name,
                    email: form.email,
                    username: form.username,
                    role_id: Number(form.role_id),
                    password: form.password,
                    password_confirmation: form.password_confirmation,
                });
                toast.success("User created successfully.");
                navigate("/users");
            } else {
                const payload: Record<string, unknown> = {
                    first_name: form.first_name,
                    last_name: form.last_name,
                    email: form.email,
                    username: form.username,
                    role_id: Number(form.role_id),
                };
                if (form.password) {
                    payload.password = form.password;
                    payload.password_confirmation = form.password_confirmation;
                }
                await updateUser.mutateAsync(payload);
                toast.success("User updated successfully.");
                setIsEditing(false);
                setForm((f) => ({
                    ...f,
                    password: "",
                    password_confirmation: "",
                }));
            }
        } catch (err: unknown) {
            const data = err as Record<string, Record<string, string>>;
            if (data?.errors) {
                // Map Laravel validation errors to field-level display
                const mapped: Record<string, string> = {};
                for (const [k, v] of Object.entries(data.errors)) {
                    mapped[k] = Array.isArray(v) ? v[0] : String(v);
                }
                setErrors(mapped);
            } else {
                toast.error(
                    isCreate
                        ? "Failed to create user."
                        : "Failed to update user.",
                );
            }
        }
    };

    const handleDelete = async () => {
        try {
            await deleteUser.mutateAsync(userId);
            toast.success("User deleted.");
            navigate("/users");
        } catch {
            toast.error("Failed to delete user.");
        }
    };

    const handleAvatar = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) setAvatarPreview(URL.createObjectURL(file));
    };

    // ── Loading state ──────────────────────────────────────────────────────────
    if (!isCreate && userLoading) {
        return (
            <div className="w-full flex flex-col items-center px-4 py-6">
                <div className="w-full max-w-2xl flex flex-col gap-6">
                    <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-6 w-32 bg-muted rounded animate-pulse" />
                    <FormSkeleton />
                </div>
            </div>
        );
    }

    // ── Error / not found state ────────────────────────────────────────────────
    if (!isCreate && (userError || (!userLoading && !userRecord))) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <AlertTriangle size={32} className="opacity-40" />
                <p className="text-sm">User not found.</p>
                <Button
                    variant="outline"
                    size="sm"
                    icon={<RefreshCw size={14} />}
                    label="Back to users"
                    onClick={() => navigate("/users")}
                />
            </div>
        );
    }

    const showEdit = isEditing || isCreate;
    const currentAvatar = avatarPreview ?? userRecord?.avatar;
    const initials =
        `${form.first_name[0] ?? ""}${form.last_name[0] ?? ""}`.toUpperCase() ||
        "?";
    const isSaving = createUser.isPending || updateUser.isPending;

    return (
        <div className="w-full flex flex-col items-center px-4 py-6">
            <div className="w-full max-w-2xl flex flex-col gap-6">
                {/* ── Back + actions ── */}
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => navigate("/users")}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <ArrowLeft size={15} /> Users
                    </button>
                    <div className="flex items-center gap-2">
                        {!isCreate && !showEdit && (
                            <Button
                                variant="outline"
                                size="sm"
                                icon={<Pencil className="w-4 h-4" />}
                                label="Edit"
                                onClick={() => setIsEditing(true)}
                            />
                        )}
                        {showEdit && !isCreate && (
                            <Button
                                variant="outline"
                                size="sm"
                                label="Cancel"
                                onClick={() => {
                                    setIsEditing(false);
                                    setErrors({});
                                    if (userRecord) {
                                        setForm({
                                            first_name: userRecord.first_name,
                                            last_name: userRecord.last_name,
                                            email: userRecord.email,
                                            username: userRecord.username,
                                            role_id: userRecord.role_id,
                                            status:
                                                userRecord.status ?? "active",
                                            password: "",
                                            password_confirmation: "",
                                        });
                                    }
                                }}
                            />
                        )}
                        {!isCreate && !showEdit && (
                            <button
                                onClick={() => setShowDelete(true)}
                                className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                            >
                                Delete
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Header ── */}
                <div>
                    <h1 className="text-xl font-semibold text-foreground">
                        {isCreate
                            ? "Add User"
                            : showEdit
                              ? "Edit User"
                              : `${userRecord?.first_name} ${userRecord?.last_name}`}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        {isCreate
                            ? "Create a new account and assign a role."
                            : showEdit
                              ? `${form.first_name || "…"} ${form.last_name || "…"} · @${form.username || "…"}`
                              : `${userRecord?.email} · @${userRecord?.username}`}
                    </p>
                </div>

                {/* ── Form ── */}
                <form
                    onSubmit={handleSubmit}
                    className="bg-card border border-border/60 rounded-xl shadow-sm p-6 sm:p-8 flex flex-col gap-6"
                >
                    {/* Avatar */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-muted border border-border flex items-center justify-center overflow-hidden shrink-0">
                            {currentAvatar ? (
                                <img
                                    src={currentAvatar}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-xl text-muted-foreground font-semibold">
                                    {initials}
                                </span>
                            )}
                        </div>
                        {showEdit && (
                            <label className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors text-muted-foreground">
                                <Upload size={14} />
                                {currentAvatar
                                    ? "Change photo"
                                    : "Upload photo"}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatar}
                                />
                            </label>
                        )}
                    </div>

                    <div className="h-px bg-border" />

                    {/* Name */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field
                            label="First name"
                            required
                            error={errors.first_name}
                        >
                            {showEdit ? (
                                <Input
                                    placeholder="Ruby"
                                    value={form.first_name}
                                    onChange={set("first_name")}
                                    className={cn(
                                        errors.first_name &&
                                            "border-destructive",
                                    )}
                                />
                            ) : (
                                <p className="text-sm text-foreground py-1">
                                    {userRecord?.first_name}
                                </p>
                            )}
                        </Field>
                        <Field
                            label="Last name"
                            required
                            error={errors.last_name}
                        >
                            {showEdit ? (
                                <Input
                                    placeholder="Arnold"
                                    value={form.last_name}
                                    onChange={set("last_name")}
                                    className={cn(
                                        errors.last_name &&
                                            "border-destructive",
                                    )}
                                />
                            ) : (
                                <p className="text-sm text-foreground py-1">
                                    {userRecord?.last_name}
                                </p>
                            )}
                        </Field>
                    </div>

                    {/* Email + Username */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Email" required error={errors.email}>
                            {showEdit ? (
                                <Input
                                    type="email"
                                    placeholder="ruby@devify.com"
                                    value={form.email}
                                    onChange={set("email")}
                                    className={cn(
                                        errors.email && "border-destructive",
                                    )}
                                />
                            ) : (
                                <p className="text-sm text-foreground py-1">
                                    {userRecord?.email}
                                </p>
                            )}
                        </Field>
                        <Field
                            label="Username"
                            required
                            hint="Letters, numbers, and dots only"
                            error={errors.username}
                        >
                            {showEdit ? (
                                <Input
                                    placeholder="ruby.arnold"
                                    value={form.username}
                                    onChange={set("username")}
                                    className={cn(
                                        errors.username && "border-destructive",
                                    )}
                                />
                            ) : (
                                <p className="text-sm text-foreground py-1">
                                    @{userRecord?.username}
                                </p>
                            )}
                        </Field>
                    </div>

                    {/* Role + Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Role" required>
                            {showEdit ? (
                                <select
                                    value={form.role_id}
                                    onChange={(e) =>
                                        setForm((f) => ({
                                            ...f,
                                            role_id: Number(e.target.value),
                                        }))
                                    }
                                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                                >
                                    <option value={1}>Admin</option>
                                    <option value={2}>Secoops</option>
                                </select>
                            ) : (
                                <span
                                    className={cn(
                                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                        userRecord?.role_id === 1
                                            ? "bg-primary/10 text-foreground"
                                            : "bg-muted text-muted-foreground",
                                    )}
                                >
                                    {userRecord?.role?.role_name ??
                                        (userRecord?.role_id === 1
                                            ? "Admin"
                                            : "Secoops")}
                                </span>
                            )}
                        </Field>
                        <Field label="Status">
                            {showEdit ? (
                                <select
                                    value={form.status}
                                    onChange={set("status")}
                                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                                >
                                    <option value="active">Active</option>
                                    <option value="inactive">Inactive</option>
                                </select>
                            ) : (
                                <span
                                    className={cn(
                                        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                                        userRecord?.status === "active"
                                            ? "bg-emerald-500/10 text-emerald-400"
                                            : "bg-red-500/10 text-red-400",
                                    )}
                                >
                                    {userRecord?.status === "active"
                                        ? "Active"
                                        : "Inactive"}
                                </span>
                            )}
                        </Field>
                    </div>

                    <div className="h-px bg-border" />

                    {/* Password */}
                    {showEdit && (
                        <div>
                            <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-3">
                                {isCreate ? "Password" : "Change password"}
                                {!isCreate && (
                                    <span className="normal-case tracking-normal font-normal">
                                        {" "}
                                        (leave blank to keep current)
                                    </span>
                                )}
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field
                                    label={
                                        isCreate ? "Password" : "New password"
                                    }
                                    required={isCreate}
                                    error={errors.password}
                                >
                                    <Input
                                        type="password"
                                        placeholder={
                                            isCreate
                                                ? "Min. 8 characters"
                                                : "New password"
                                        }
                                        value={form.password}
                                        onChange={set("password")}
                                        className={cn(
                                            errors.password &&
                                                "border-destructive",
                                        )}
                                    />
                                </Field>
                                <Field
                                    label="Confirm password"
                                    required={isCreate}
                                    error={errors.password_confirmation}
                                >
                                    <Input
                                        type="password"
                                        placeholder="Repeat password"
                                        value={form.password_confirmation}
                                        onChange={set("password_confirmation")}
                                        className={cn(
                                            errors.password_confirmation &&
                                                "border-destructive",
                                        )}
                                    />
                                </Field>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    {showEdit && (
                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/40">
                            <Button
                                type="submit"
                                disabled={isSaving}
                                label={
                                    isSaving
                                        ? "Saving…"
                                        : isCreate
                                          ? "Create User"
                                          : "Save Changes"
                                }
                            />
                        </div>
                    )}
                </form>

                {/* ── Delete dialog ── */}
                <Dialog open={showDelete} onOpenChange={setShowDelete}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Remove User</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                            This will permanently delete{" "}
                            <strong className="text-foreground">
                                {form.first_name} {form.last_name}
                            </strong>{" "}
                            and cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3 pt-2">
                            <DialogClose asChild>
                                <Button
                                    variant="outline"
                                    label="Cancel"
                                    onClick={() => setShowDelete(false)}
                                />
                            </DialogClose>
                            <Button
                                variant="danger"
                                label={
                                    deleteUser.isPending
                                        ? "Removing…"
                                        : "Remove"
                                }
                                disabled={deleteUser.isPending}
                                onClick={handleDelete}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </div>
    );
}
