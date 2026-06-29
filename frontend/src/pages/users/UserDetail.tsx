import { useState, useEffect } from "react";
import { z } from "zod";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Upload, AlertTriangle, Trash2, RefreshCw } from "lucide-react";
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
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { uploadFile } from "@/lib/uploadToast";

//helper function to format phone numbers
import { formatPhoneNumber } from "@/utils/helpers";

// ─── Form skeleton ────────────────────────────────────────────────────────────

function FormSkeleton() {
    return (
        <div className="bg-card border border-border/60 rounded-xl shadow-sm p-6 sm:p-8 flex flex-col gap-6 animate-pulse">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
                <div className="space-y-2 flex-1">
                    <div className="h-5 w-40 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                </div>
            </div>
            <div className="h-px bg-border" />
            {[0, 1, 2].map((i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="h-3 w-16 bg-muted rounded" />
                        <div className="h-9 bg-muted rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-3 w-16 bg-muted rounded" />
                        <div className="h-9 bg-muted rounded-md" />
                    </div>
                </div>
            ))}
            <div className="h-px bg-border" />
            <div className="flex justify-end">
                <div className="h-9 w-28 bg-muted rounded-md" />
            </div>
        </div>
    );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({
    label,
    required,
    children,
    error,
    hint,
    isEdit = true,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
    error?: string;
    hint?: string;
    isEdit?: boolean;
}) {
    return (
        <div className="flex flex-col gap-1">
            <Label>
                {label}
                {required && isEdit && (
                    <span className="text-destructive ml-0.5">*</span>
                )}
            </Label>
            {children}
            {hint && (
                <p className="text-[11px] text-muted-foreground">{hint}</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
    title,
    description,
}: {
    title: string;
    description?: string;
}) {
    return (
        <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                    {description}
                </p>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserDetail() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { setTrail } = useBreadcrumb();
    const userId = Number(id);

    const [mode, setMode] = useState<"view" | "create" | "edit">(
        id ? "view" : "create",
    );
    const showEdit = mode !== "view";

    // ── Data fetching ──────────────────────────────────────────────────────────
    const { data: user, isLoading, isError } = useUser(userId);

    // ── Mutations ──────────────────────────────────────────────────────────────
    const createUser = useCreateUser();
    const updateUser = useUpdateUser(userId);
    const deleteUser = useDeleteUser();

    // ── Local state ────────────────────────────────────────────────────────────
    const [showDelete, setShowDelete] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
        username: "",
        phone_number: "",
        password: "",
        password_confirmation: "",
    });

    // Reset mode when navigating between users / to create
    useEffect(() => {
        const next = id ? "view" : "create";
        setMode(next);
        if (next === "create") {
            setForm({
                first_name: "",
                last_name: "",
                email: "",
                username: "",
                phone_number: "",
                password: "",
                password_confirmation: "",
            });
            setAvatarPreview(null);
            setAvatarFile(null);
            setErrors({});
        }
    }, [id]);

    // Populate form when user data arrives
    useEffect(() => {
        if (user) {
            setForm({
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                username: user.username,
                phone_number: user.phone_number,
                password: "",
                password_confirmation: "",
            });
            setAvatarPreview(user.profile_picture_url ?? null);
        }
    }, [user]);

    // Breadcrumb
    useEffect(() => {
        if (mode === "create") {
            setTrail([
                { label: "Users", href: "/users" },
                { label: "Create", href: "/users/create" },
            ]);
        } else if (user) {
            setTrail([
                { label: "Users", href: "/users" },
                {
                    label: `${user.first_name} ${user.last_name}`,
                    href: `/users/${user.id}`,
                },
            ]);
        }
    }, [setTrail, mode, user]);

    const set =
        (key: keyof typeof form) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
            setForm((f) => ({ ...f, [key]: e.target.value }));

    // ── Validation ─────────────────────────────────────────────────────────────
    const isCreate = mode === "create";

    const schema = z
        .object({
            first_name: z.string().trim().min(1, "Required"),
            last_name: z.string().trim().min(1, "Required"),
            email: z.string().trim().min(1, "Required").email("Invalid email"),
            username: z.string().trim().min(1, "Required"),
            phone_number: z
                .string()
                .trim()
                .min(1, "Required")
                .regex(
                    /^09\d{9}$/,
                    "Must be a valid PH number starting with 09 (e.g. 09123456789)",
                ),
            password: z.string().superRefine((val, ctx) => {
                if (isCreate && !val)
                    ctx.addIssue({
                        code: "custom",
                        message: "Required",
                    });
                else if (val && val.length < 8)
                    ctx.addIssue({
                        code: "custom",
                        message: "Minimum 8 characters",
                    });
            }),
            password_confirmation: z.string(),
        })
        .superRefine((data, ctx) => {
            if (data.password && data.password !== data.password_confirmation) {
                ctx.addIssue({
                    code: "custom",
                    path: ["password_confirmation"],
                    message: "Passwords do not match",
                });
            }
        });

    const validate = (): boolean => {
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

    // ── Handlers ───────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            let uploadFields: Record<string, string> = {};

            if (avatarFile) {
                const { storage_key, intent_id } = await uploadFile(
                    avatarFile,
                    "profile_picture",
                    "Uploading avatar…",
                );
                uploadFields = {
                    upload_intent_id: intent_id,
                    profile_picture_storage_key: storage_key,
                };
            }

            if (mode === "create") {
                const createPayload = {
                    first_name: form.first_name,
                    last_name: form.last_name,
                    email: form.email,
                    username: form.username,
                    phone_number: form.phone_number,
                    password: form.password,
                    password_confirmation: form.password_confirmation,
                    ...uploadFields,
                };
                await createUser.mutateAsync(createPayload);
                toast.success("User created successfully.");
                navigate("/users");
            } else {
                const updatePayload = {
                    first_name: form.first_name,
                    last_name: form.last_name,
                    email: form.email,
                    username: form.username,
                    phone_number: form.phone_number,
                    ...(form.password
                        ? {
                              password: form.password,
                              password_confirmation: form.password_confirmation,
                          }
                        : {}),
                    ...uploadFields,
                };
                await updateUser.mutateAsync(updatePayload);
                toast.success("User updated successfully.");
                setMode("view");
                setForm((f) => ({
                    ...f,
                    password: "",
                    password_confirmation: "",
                }));
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            // uploadFile handles toast cleanup on error
            console.error("Submission failed:", err);

            // 2. Safely extract validation errors from Axios or native requests
            const errorData = err?.response?.data || err;

            if (errorData?.errors) {
                const mapped: Record<string, string> = {};
                for (const [k, v] of Object.entries(errorData.errors)) {
                    mapped[k] = Array.isArray(v) ? v[0] : String(v);
                }
                setErrors(mapped);
            } else {
                // 3. Provide a fallback message from the server if available, otherwise use your generic text
                const serverMessage =
                    err?.response?.data?.message || err?.message;
                toast.error(
                    serverMessage ||
                        (mode === "create"
                            ? "Failed to create user."
                            : "Failed to update user."),
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

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setAvatarFile(file);
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setAvatarPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setAvatarPreview(user?.profile_picture_url ?? null);
        }
    };

    const cancelEdit = () => {
        setMode("view");
        setErrors({});
        if (user) {
            setForm({
                first_name: user.first_name,
                last_name: user.last_name,
                email: user.email,
                username: user.username,
                phone_number: user.phone_number,
                password: "",
                password_confirmation: "",
            });
            setAvatarPreview(user.profile_picture_url ?? null);
            setAvatarFile(null);
        }
    };

    // ── Loading state ──────────────────────────────────────────────────────────
    if (mode !== "create" && isLoading) {
        return (
            <div className="w-full flex flex-col items-center px-4 py-6">
                <div className="w-full max-w-3xl flex flex-col gap-6">
                    <div className="h-5 w-24 bg-muted rounded animate-pulse" />
                    <div className="h-6 w-48 bg-muted rounded animate-pulse" />
                    <FormSkeleton />
                </div>
            </div>
        );
    }

    // ── Error / not found state ────────────────────────────────────────────────
    if (mode !== "create" && (isError || (!isLoading && !user))) {
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

    // ── Derived state ──────────────────────────────────────────────────────────
    const DEFAULT_AVATAR = import.meta.env.VITE_DEFAULT_PROFILE_PICTURE || null;
    const avatarSrc = avatarPreview || DEFAULT_AVATAR;
    const avatarInputId = "avatar-upload";
    const isSaving = createUser.isPending || updateUser.isPending;

    return (
        <>
            <LoadingOverlay visible={isSaving} />
            <div className="w-full flex flex-col min-h-0 bg-background text-foreground">
                {/* ── Banner / Hero ── */}
                <div className="relative">
                    <div className="absolute inset-0 overflow-hidden rounded-t-xl">
                        <div
                            className="w-full h-full"
                            style={{
                                background:
                                    "linear-gradient(135deg, oklch(0.18 0.04 260 / 0.6), oklch(0.12 0.03 280 / 0.4))",
                            }}
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-transparent" />
                        <div className="absolute inset-0 bg-linear-to-r from-background/40 to-transparent" />
                    </div>

                    <div className="relative z-10 px-6 sm:px-8 lg:px-10 pt-6 pb-20">
                        {/* ── Top bar: actions ── */}
                        <div className="flex items-center justify-end mb-6">
                            <div className="flex items-center gap-2">
                                {mode === "edit" && (
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        icon={<Trash2 size={13} />}
                                        label="Delete"
                                        className="bg-red-600/70"
                                        onClick={() => setShowDelete(true)}
                                    />
                                )}

                                {mode !== "create" && !showEdit && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        icon={<Pencil className="w-4 h-4" />}
                                        label="Edit"
                                        onClick={() => setMode("edit")}
                                    />
                                )}
                                {showEdit && mode !== "create" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        label="Cancel"
                                        onClick={cancelEdit}
                                    />
                                )}
                                {showEdit && mode === "create" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        label="Cancel"
                                        onClick={() => navigate("/users")}
                                    />
                                )}
                            </div>
                        </div>

                        {/* ── Avatar + Name ── */}
                        <div className="flex items-end gap-5">
                            {/* Avatar */}
                            <div className="relative shrink-0">
                                <div className="w-20 h-20 rounded-full bg-card border-4 border-background shadow-sm overflow-hidden">
                                    <img
                                        src={avatarSrc}
                                        alt="Avatar"
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                {showEdit && (
                                    <label
                                        htmlFor={avatarInputId}
                                        className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-foreground text-background flex items-center justify-center cursor-pointer shadow-sm hover:opacity-90 transition-opacity"
                                    >
                                        <Upload size={12} />
                                        <input
                                            id={avatarInputId}
                                            type="file"
                                            accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                                            onChange={handleAvatarChange}
                                            className="hidden"
                                        />
                                    </label>
                                )}
                            </div>

                            {/* Name */}
                            <div className="flex-1 min-w-0 pb-1">
                                {showEdit ? (
                                    <div className="grid grid-cols-2 gap-3 max-w-md">
                                        <div>
                                            <Label className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1">
                                                First name
                                            </Label>
                                            <input
                                                value={form.first_name}
                                                onChange={set("first_name")}
                                                placeholder="First name"
                                                className="w-full text-xl sm:text-2xl font-bold tracking-tight bg-transparent border-b-2 border-primary/50 outline-none pb-1 placeholder:text-muted-foreground/40 text-foreground"
                                            />
                                            {errors.first_name && (
                                                <p className="text-xs text-destructive mt-1">
                                                    {errors.first_name}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <Label className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1">
                                                Last name
                                            </Label>
                                            <input
                                                value={form.last_name}
                                                onChange={set("last_name")}
                                                placeholder="Last name"
                                                className="w-full text-xl sm:text-2xl font-bold tracking-tight bg-transparent border-b-2 border-primary/50 outline-none pb-1 placeholder:text-muted-foreground/40 text-foreground"
                                            />
                                            {errors.last_name && (
                                                <p className="text-xs text-destructive mt-1">
                                                    {errors.last_name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
                                            {user
                                                ? `${user.first_name} ${user.last_name}`
                                                : "New User"}
                                        </h1>
                                        {user && (
                                            <p className="text-sm text-muted-foreground mt-1">
                                                @{user.username}
                                            </p>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>

                        {/* ── Role / Status badges (view mode only) ── */}
                        {!showEdit && user && (
                            <div className="flex items-center gap-2 mt-4">
                                <span
                                    className={cn(
                                        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium",
                                        user.record_status === "active"
                                            ? "bg-emerald-500/10 text-emerald-400"
                                            : "bg-red-500/10 text-red-400",
                                    )}
                                >
                                    <span
                                        className={cn(
                                            "w-1.5 h-1.5 rounded-full",
                                            user.record_status === "active"
                                                ? "bg-emerald-400"
                                                : "bg-red-400",
                                        )}
                                    />
                                    {user.record_status === "active"
                                        ? "Active"
                                        : "Inactive"}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Content ── */}
                <div className="flex-1 -mt-12 relative z-20 px-6 sm:px-8 lg:px-10 pb-8">
                    <div className="max-w-3xl mx-auto flex flex-col gap-6">
                        {/* ── Form card ── */}
                        <form
                            onSubmit={handleSubmit}
                            className="bg-card border border-border/60 rounded-xl shadow-sm p-6 sm:p-8 flex flex-col gap-8"
                        >
                            {/* Basic Information */}
                            <section className="space-y-4">
                                <SectionHeader
                                    title="Basic Information"
                                    description="Core identity details for this account."
                                />
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field
                                        label="Email Address"
                                        required
                                        error={errors.email}
                                        isEdit={showEdit}
                                    >
                                        {showEdit ? (
                                            <Input
                                                type="email"
                                                placeholder="ruby@devify.com"
                                                value={form.email}
                                                onChange={set("email")}
                                                className={cn(
                                                    errors.email &&
                                                        "border-destructive",
                                                )}
                                            />
                                        ) : (
                                            <p className="text-sm text-foreground py-1">
                                                {user?.email}
                                            </p>
                                        )}
                                    </Field>
                                    <Field
                                        label="Username"
                                        required
                                        hint={
                                            showEdit
                                                ? "Letters, numbers, and dots only"
                                                : undefined
                                        }
                                        error={errors.username}
                                        isEdit={showEdit}
                                    >
                                        {showEdit ? (
                                            <Input
                                                placeholder="ruby.arnold"
                                                value={form.username}
                                                onChange={set("username")}
                                                className={cn(
                                                    errors.username &&
                                                        "border-destructive",
                                                )}
                                            />
                                        ) : (
                                            <p className="text-sm text-foreground py-1">
                                                @{user?.username}
                                            </p>
                                        )}
                                    </Field>
                                    <Field
                                        label="Phone Number"
                                        required
                                        error={errors.phone_number}
                                        isEdit={showEdit}
                                    >
                                        {showEdit ? (
                                            <Input
                                                placeholder="e.g. 09123456789"
                                                value={form.phone_number}
                                                onChange={(e) => {
                                                    const numeric =
                                                        formatPhoneNumber(
                                                            e.target.value,
                                                        );
                                                    setForm((f) => ({
                                                        ...f,
                                                        phone_number: numeric,
                                                    }));
                                                }}
                                                className={cn(
                                                    errors.phone_number &&
                                                        "border-destructive",
                                                )}
                                            />
                                        ) : (
                                            <p className="text-sm text-foreground py-1">
                                                {user?.phone_number
                                                    ? formatPhoneNumber(
                                                          user.phone_number,
                                                      )
                                                    : "—"}
                                            </p>
                                        )}
                                    </Field>
                                </div>
                            </section>

                            {/* Password */}
                            {showEdit && (
                                <>
                                    <div className="h-px bg-border" />
                                    <section className="space-y-4">
                                        <SectionHeader
                                            title={
                                                isCreate
                                                    ? "Password"
                                                    : "Change Password"
                                            }
                                            description={
                                                isCreate
                                                    ? "Set an initial password for this account."
                                                    : "Leave blank to keep the current password."
                                            }
                                        />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Field
                                                label={
                                                    isCreate
                                                        ? "Password"
                                                        : "New password"
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
                                                error={
                                                    errors.password_confirmation
                                                }
                                            >
                                                <Input
                                                    type="password"
                                                    placeholder="Repeat password"
                                                    value={
                                                        form.password_confirmation
                                                    }
                                                    onChange={set(
                                                        "password_confirmation",
                                                    )}
                                                    className={cn(
                                                        errors.password_confirmation &&
                                                            "border-destructive",
                                                    )}
                                                />
                                            </Field>
                                        </div>
                                    </section>
                                </>
                            )}

                            {/* Actions */}
                            {showEdit && (
                                <>
                                    <div className="h-px bg-border" />
                                    <div className="flex items-center justify-end gap-3">
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
                                </>
                            )}
                        </form>
                    </div>
                </div>

                {/* ── Delete dialog ── */}
                <Dialog open={showDelete} onOpenChange={setShowDelete}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Delete User</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                            This will permanently delete{" "}
                            <strong className="text-foreground">
                                {user?.first_name} {user?.last_name}
                            </strong>{" "}
                            and all associated data. This cannot be undone.
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
                                        ? "Deleting…"
                                        : "Delete"
                                }
                                disabled={deleteUser.isPending}
                                onClick={handleDelete}
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}
