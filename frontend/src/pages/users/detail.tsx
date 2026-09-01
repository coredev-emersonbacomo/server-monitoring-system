import { useState, useEffect, useMemo } from "react";
import { z } from "zod";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
    Pencil,
    Upload,
    AlertTriangle,
    RefreshCw,
    Info,
    Building,
    Plus,
    Users,
} from "lucide-react";
import { toast } from "sonner";
import IndexHeader from "@/components/IndexHeader";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floatingInput";
import { Label } from "@/components/ui/label";
import {
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
    useUserClients,
    useAddUserClient,
    useRemoveUserClient,
} from "@/hooks/useUsers";
import { useClients } from "@/hooks/useClients";
import { useSettings } from "@/hooks/useSettings";
import { Tab } from "@/components/ui/tab";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { uploadFile } from "@/lib/uploadToast";
import { formatPhoneNumber } from "@/utils/helpers";
import { Form, createFormStore, useForm } from "@/components/ui/form";
import { TimezoneCombobox, tzOffsetLabel } from "@/components/TimezoneCombobox";
import { FormStoreProvider } from "@/components/ui/form/FormStoreProvider";
import { AssignClientDialog } from "./components/AssignClientDialog";
import { DeleteUserDialog } from "./components/DeleteUserDialog";
import { VerifyRequiredModal } from "@/components/VerifyRequiredModal";
// ─── Schema ──────────────────────────────────────────────────────────────────

const BROWSER_TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

const userSchema = z
    .object({
        first_name: z.string().trim().min(1, "Required"),
        last_name: z.string().trim().min(1, "Required"),
        email: z.email("Invalid email").trim().min(1, "Required"),
        username: z.string().trim().min(1, "Required"),
        timezone: z.string().min(1, "Required"),
        phone_number: z
            .string()
            .trim()
            .min(1, "Required")
            .regex(
                /^09\d{9}$/,
                "Must be a valid PH number starting with 09 (e.g. 09123456789)",
            ),
        password: z.string().superRefine((val, ctx) => {
            if (val && val.length < 8)
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
            <Label className="text-muted-foreground font-normal">
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
    const { uuid = "" } = useParams<{ uuid: string }>();

    // ── Data fetching ──────────────────────────────────────────────────────────
    const { data: user, isLoading, isError } = useUser(uuid);

    useDocumentTitle(
        user ? `${user.first_name} ${user.last_name}` : undefined,
    );

    const { data: userClients = [], isLoading: clientsLoading } =
        useUserClients(uuid);
    const { data: clientsResponse } = useClients();
    const allClients = clientsResponse?.data ?? [];
    const assignedClientUuids = userClients.map((c) => c.uuid);
    const { data: settings } = useSettings();

    // ── Mutations ──────────────────────────────────────────────────────────────
    const createUser = useCreateUser();
    const updateUser = useUpdateUser(uuid);
    const deleteUser = useDeleteUser();
    const addClient = useAddUserClient(uuid);
    const removeClient = useRemoveUserClient(uuid);

    const isCreate = !uuid;

    // ── Form store ─────────────────────────────────────────────────────────────
    const store = useMemo(() => {
        if (isCreate) {
            return createFormStore({
                schema: userSchema,
                originalData: {
                    first_name: "",
                    last_name: "",
                    email: "",
                    username: "",
                    phone_number: "",
                    timezone: BROWSER_TIMEZONE,
                    password: "",
                    password_confirmation: "",
                },
                initialMode: "create",
            });
        }
        return createFormStore({
            schema: userSchema,
            originalData: user
                ? {
                      first_name: user.first_name,
                      last_name: user.last_name,
                      email: user.email,
                      username: user.username,
                      phone_number: user.phone_number,
                      timezone: user.timezone || "",
                      password: "",
                      password_confirmation: "",
                  }
                : {
                      first_name: "",
                      last_name: "",
                      email: "",
                      username: "",
                      phone_number: "",
                      timezone: "",
                      password: "",
                      password_confirmation: "",
                  },
            initialMode: "view",
        });
    }, [isCreate, user]);

    // ── Local state ────────────────────────────────────────────────────────────
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [showClientDialog, setShowClientDialog] = useState(false);
    const [showVerifyRequired, setShowVerifyRequired] = useState(false);
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [localErrors, setErrors] = useState<Record<string, string>>({});

    const isSaving = createUser.isPending || updateUser.isPending || isSubmitting;

    const form = useForm(store, (s) => s.form);
    const mode = useForm(store, (s) => s.mode);
    const storeErrors = useForm(store, (s) => s.errors);
    const errors = { ...storeErrors, ...localErrors };
    const showEdit = mode !== "view";

    // Populate form when user data arrives
    useEffect(() => {
        if (user && !isCreate) {
            store.setState({
                form: {
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    username: user.username,
                    phone_number: user.phone_number,
                    timezone: user.timezone || "",
                    password: "",
                    password_confirmation: "",
                },
                originalData: {
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    username: user.username,
                    phone_number: user.phone_number,
                    timezone: user.timezone || "",
                    password: "",
                    password_confirmation: "",
                },
            });
            setAvatarPreview(user.profile_picture_url ?? null);
        }
    }, [isCreate, store, user, user?.uuid]);

    const hasChanges = useMemo(() => {
        if (isCreate) {
            return (
                form.first_name !== "" ||
                form.last_name !== "" ||
                form.email !== "" ||
                form.username !== "" ||
                form.phone_number !== "" ||
                form.timezone !== BROWSER_TIMEZONE ||
                form.password !== "" ||
                form.password_confirmation !== "" ||
                avatarFile !== null
            );
        }
        if (!user) return false;
        const formChanged =
            form.first_name !== user.first_name ||
            form.last_name !== user.last_name ||
            form.email !== user.email ||
            form.username !== user.username ||
            form.phone_number !== user.phone_number ||
            form.timezone !== (user.timezone || "") ||
            form.password !== "" ||
            form.password_confirmation !== "";
        return formChanged || avatarFile !== null;
    }, [form, user, avatarFile, isCreate]);

    const trail = useMemo(() => {
        if (isCreate) {
            return [{ label: "Users", href: "/users" }, { label: "Create" }];
        } else if (user) {
            return [
                { label: "Users", href: "/users" },
                { label: `${user.first_name} ${user.last_name}` },
            ];
        }
        return [];
    }, [isCreate, user]);

    // ── Handlers ───────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (isSaving) return;

        // Run Zod schema validation
        const result = userSchema.safeParse(form);
        const newErrors: Record<string, string> = {};

        if (!result.success) {
            for (const issue of result.error.issues) {
                const key = issue.path[0] as string;
                if (!newErrors[key]) newErrors[key] = issue.message;
            }
        }

        // Extra validation for create mode: password required
        if (isCreate && !form.password) {
            newErrors.password = "Password is required";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            store.setState({ errors: newErrors });
            toast.error("Please fill in all required fields correctly.");
            return;
        }

        setErrors({});
        store.setState({ errors: {} });
        setIsSubmitting(true);

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

            if (isCreate) {
                const createPayload = {
                    first_name: form.first_name,
                    last_name: form.last_name,
                    email: form.email,
                    username: form.username,
                    phone_number: form.phone_number,
                    timezone: form.timezone,
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
                    timezone: form.timezone,
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
                store.setMode("view");
                store.setState({
                    form: {
                        ...form,
                        password: "",
                        password_confirmation: "",
                    },
                    originalData: {
                        ...form,
                        password: "",
                        password_confirmation: "",
                    },
                    errors: {},
                    externalDirty: false,
                });
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            console.error("Submission failed:", err);
            const errorData = err?.response?.data || err;

            if (errorData?.errors) {
                const mapped: Record<string, string> = {};
                for (const [k, v] of Object.entries(errorData.errors)) {
                    mapped[k] = Array.isArray(v) ? v[0] : String(v);
                }
                setErrors(mapped);
                store.setState({ errors: mapped });
            } else {
                const serverMessage =
                    err?.response?.data?.message || err?.message;
                toast.error(
                    serverMessage ||
                        (isCreate
                            ? "Failed to create user."
                            : "Failed to update user."),
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteUser.mutateAsync(uuid);
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
        store.setMode("view");
        setErrors({});
        if (user) {
            store.setState({
                form: {
                    first_name: user.first_name,
                    last_name: user.last_name,
                    email: user.email,
                    username: user.username,
                    phone_number: user.phone_number,
                    timezone: user.timezone || "",
                    password: "",
                    password_confirmation: "",
                },
            });
            setAvatarPreview(user.profile_picture_url ?? null);
            setAvatarFile(null);
        }
    };

    // ── Loading state ──────────────────────────────────────────────────────────
    if (!isCreate && isLoading) {
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
    if (!isCreate && (isError || (!isLoading && !user))) {
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

    const secopLimit =
        parseInt(settings?.secop_limit_per_client ?? "2", 10) || 2;

    const availableClients = allClients.filter((client) => {
        const isAssigned = userClients.some((uc) => uc.uuid === client.uuid);
        const count = client.secops_count ?? 0;
        return !isAssigned && count < secopLimit;
    });

    return (
        <>
            <LoadingOverlay visible={isSaving} />
            <div className="w-full flex flex-col min-h-0 bg-background text-foreground">
                {/* ── Breadcrumb ── */}
                <IndexHeader icon={Users} trail={trail} />

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

                    <div className="relative z-10 px-6 sm:px-8 lg:px-10 pt-6 pb-20 min-h-60">
                        {/* ── Top bar: actions ── */}
                        <div className="flex items-center justify-end mb-6">
                            <div className="flex items-center gap-2">
                                {mode === "edit" && (
                                    <FormStoreProvider store={store}>
                                        <Form.DeleteModal
                                            buttonProps={{
                                                size: "sm",
                                                className:
                                                    "bg-red-600/70 cursor-pointer",
                                            }}
                                            onOpenChange={(open) => {
                                                if (open) setShowDelete(true);
                                            }}
                                            modal={(show) => (
                                                <DialogContent className="sm:max-w-sm">
                                                    <DialogHeader>
                                                        <DialogTitle>
                                                            Delete User
                                                        </DialogTitle>
                                                    </DialogHeader>
                                                    <p className="text-sm text-muted-foreground">
                                                        This will permanently
                                                        delete{" "}
                                                        <strong className="text-foreground">
                                                            {user?.first_name}{" "}
                                                            {user?.last_name}
                                                        </strong>{" "}
                                                        and all associated data.
                                                        This cannot be undone.
                                                    </p>
                                                    <div className="flex justify-end gap-3 pt-2">
                                                        <DialogClose asChild>
                                                            <Button
                                                                variant="outline"
                                                                label="Cancel"
                                                                onClick={() =>
                                                                    show(false)
                                                                }
                                                            />
                                                        </DialogClose>
                                                        <Button
                                                            variant="danger"
                                                            label={
                                                                deleteUser.isPending
                                                                    ? "Deleting…"
                                                                    : "Delete"
                                                            }
                                                            disabled={
                                                                deleteUser.isPending
                                                            }
                                                            onClick={() => {
                                                                show(false);
                                                                handleDelete();
                                                            }}
                                                        />
                                                    </div>
                                                </DialogContent>
                                            )}
                                        />
                                    </FormStoreProvider>
                                )}
                                {mode !== "create" && !showEdit && (
                                    <Button
                                        className="cursor-pointer"
                                        variant="outline"
                                        size="sm"
                                        icon={<Pencil className="w-4 h-4" />}
                                        label="Edit"
                                        onClick={() => store.setMode("edit")}
                                    />
                                )}
                                {showEdit && mode !== "create" && (
                                    <>
                                        <Button
                                            className="cursor-pointer"
                                            variant="outline"
                                            size="sm"
                                            label="Cancel"
                                            onClick={cancelEdit}
                                            disabled={isSaving}
                                        />
                                        <Button
                                            className="cursor-pointer"
                                            type="submit"
                                            form="user-detail-form"
                                            size="sm"
                                            onClick={handleSubmit}
                                            disabled={isSaving || !hasChanges}
                                            label={
                                                isSaving
                                                    ? "Saving…"
                                                    : "Save Changes"
                                            }
                                        />
                                    </>
                                )}
                                {showEdit && isCreate && (
                                    <>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            label="Cancel"
                                            onClick={() => navigate("/users")}
                                        />
                                        <Button
                                            className="cursor-pointer"
                                            type="submit"
                                            form="user-detail-form"
                                            size="sm"
                                            onClick={handleSubmit}
                                            disabled={isSaving}
                                            label={
                                                isSaving
                                                    ? "Saving…"
                                                    : "Create User"
                                            }
                                        />
                                    </>
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
                                                onChange={(e) =>
                                                    store.set("first_name")(
                                                        e.target.value,
                                                    )
                                                }
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
                                                onChange={(e) =>
                                                    store.set("last_name")(
                                                        e.target.value,
                                                    )
                                                }
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
                        <Tab>
                            <Tab.Item icon={Info} title="Details">
                                <Form.Root
                                    store={store}
                                    id="user-detail-form"
                                    className="bg-card border border-border/60 shadow-sm p-6 sm:p-8 flex flex-col gap-8"
                                >
                                    <Form.SubmitHandler
                                        handler={handleSubmit}
                                    />

                                    {/* Basic Information */}
                                    <section className="space-y-4">
                                        <SectionHeader
                                            title="Basic Information"
                                            description="Core identity details for this account."
                                        />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {showEdit ? (
                                                <FloatingInput
                                                    type="email"
                                                    label="Email Address"
                                                    value={form.email}
                                                    onValueChange={store.set(
                                                        "email",
                                                    )}
                                                    error={errors.email}
                                                />
                                            ) : (
                                                <Field
                                                    label="Email Address"
                                                    required
                                                    isEdit={showEdit}
                                                >
                                                    <p className="text-base font-semibold text-foreground py-1">
                                                        {user?.email}
                                                    </p>
                                                </Field>
                                            )}

                                            {showEdit ? (
                                                <div>
                                                    <FloatingInput
                                                        label="Username"
                                                        value={form.username}
                                                        onValueChange={store.set(
                                                            "username",
                                                        )}
                                                        error={errors.username}
                                                    />
                                                    {!errors.username && (
                                                        <p className="text-[11px] text-muted-foreground mt-1">
                                                            Letters, numbers,
                                                            and dots only
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <Field
                                                    label="Username"
                                                    required
                                                    isEdit={showEdit}
                                                >
                                                    <p className="text-base font-semibold text-foreground py-1">
                                                        @{user?.username}
                                                    </p>
                                                </Field>
                                            )}

                                            {showEdit ? (
                                                <div>
                                                    <FloatingInput
                                                        label="Phone Number"
                                                        value={
                                                            form.phone_number
                                                        }
                                                        onValueChange={(
                                                            value,
                                                        ) => {
                                                            // Strip non-digits, hard cap at 11
                                                            const digits = value
                                                                .replace(
                                                                    /\D/g,
                                                                    "",
                                                                )
                                                                .slice(0, 11);
                                                            store.set(
                                                                "phone_number",
                                                            )(digits);

                                                            // Live validation
                                                            if (
                                                                digits.length ===
                                                                0
                                                            ) {
                                                                setErrors(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        phone_number:
                                                                            "Phone number is required",
                                                                    }),
                                                                );
                                                            } else if (
                                                                !digits.startsWith(
                                                                    "09",
                                                                )
                                                            ) {
                                                                setErrors(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        phone_number:
                                                                            "Must start with 09",
                                                                    }),
                                                                );
                                                            } else if (
                                                                digits.length <
                                                                11
                                                            ) {
                                                                setErrors(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        phone_number: `${11 - digits.length} more digit${11 - digits.length !== 1 ? "s" : ""} needed`,
                                                                    }),
                                                                );
                                                            } else {
                                                                // Valid — clear error
                                                                setErrors(
                                                                    (prev) => {
                                                                        const n =
                                                                            {
                                                                                ...prev,
                                                                            };
                                                                        delete n.phone_number;
                                                                        return n;
                                                                    },
                                                                );
                                                            }
                                                        }}
                                                        maxLength={11}
                                                        error={
                                                            errors.phone_number
                                                        }
                                                    />
                                                </div>
                                            ) : (
                                                <Field
                                                    label="Phone Number"
                                                    required
                                                    isEdit={showEdit}
                                                >
                                                    <p className="text-base font-semibold text-foreground py-1">
                                                        {user?.phone_number
                                                            ? formatPhoneNumber(
                                                                  user.phone_number,
                                                              )
                                                            : "—"}
                                                    </p>
                                                </Field>
                                            )}
                                        </div>
                                    </section>

                                    {/* Timezone */}
                                    <div className="h-px bg-border" />
                                    <section className="space-y-4">
                                        <SectionHeader
                                            title="Timezone"
                                            description="Used to localize alert notification timestamps for this user."
                                        />
                                        {showEdit ? (
                                            <div className="max-w-sm">
                                                <TimezoneCombobox
                                                    value={form.timezone}
                                                    onValueChange={store.set(
                                                        "timezone",
                                                    )}
                                                />
                                            </div>
                                        ) : (
                                            <Field
                                                label="Timezone"
                                                isEdit={showEdit}
                                            >
                                                <p className="text-base font-semibold text-foreground py-1">
                                                    {user?.timezone
                                                        ? `${user.timezone} (${tzOffsetLabel(user.timezone)})`
                                                        : "—"}
                                                </p>
                                            </Field>
                                        )}
                                    </section>

                                    {/* Password */}
                                    {showEdit && (
                                        <>
                                            <div className="h-px bg-border" />
                                            <section className="space-y-4">
                                                <SectionHeader
                                                    title={
                                                        isCreate
                                                            ? "Set Password"
                                                            : "Change Password"
                                                    }
                                                    description={
                                                        isCreate
                                                            ? "Must be at least 8 characters."
                                                            : "Leave blank to keep current password."
                                                    }
                                                />
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    <FloatingInput
                                                        type="password"
                                                        label="Password"
                                                        value={form.password}
                                                        onValueChange={store.set(
                                                            "password",
                                                        )}
                                                        error={errors.password}
                                                    />
                                                    <FloatingInput
                                                        type="password"
                                                        label="Confirm Password"
                                                        value={
                                                            form.password_confirmation
                                                        }
                                                        onValueChange={store.set(
                                                            "password_confirmation",
                                                        )}
                                                        error={
                                                            errors.password_confirmation
                                                        }
                                                    />
                                                </div>
                                            </section>
                                        </>
                                    )}
                                </Form.Root>
                            </Tab.Item>

                            {mode === "view" && user && (
                                <Tab.Item icon={Building} title="Client Scope">
                                    <div className="bg-card border border-border/60 shadow-sm p-6 sm:p-8 flex flex-col gap-8">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h2 className="text-base font-semibold text-foreground">
                                                    Assigned Clients
                                                </h2>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Manage clients this SecOps
                                                    user is assigned to.
                                                </p>
                                            </div>
                                            <Button
                                                className="cursor-pointer"
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                icon={<Plus size={14} />}
                                                label="Assign Client"
                                                onClick={() =>
                                                    setShowClientDialog(true)
                                                }
                                            />
                                        </div>

                                        {clientsLoading ? (
                                            <div className="space-y-2">
                                                {[0, 1, 2].map((i) => (
                                                    <div
                                                        key={i}
                                                        className="h-10 bg-muted rounded animate-pulse"
                                                    />
                                                ))}
                                            </div>
                                        ) : userClients.length > 0 ? (
                                            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                                                {userClients.map((client) => (
                                                    <div
                                                        key={client.uuid}
                                                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors"
                                                    >
                                                        <Link
                                                            to={`/clients/${client.uuid}`}
                                                            aria-label={`Open ${client.name}`}
                                                            className="flex items-center gap-3 flex-1 min-w-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                                        >
                                                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-muted shrink-0 flex items-center justify-center">
                                                                {client.banner_image_url ? (
                                                                    <img
                                                                        src={
                                                                            client.banner_image_url
                                                                        }
                                                                        alt={
                                                                            client.name
                                                                        }
                                                                        className="h-full w-full object-cover"
                                                                    />
                                                                ) : (
                                                                    <Building
                                                                        size={
                                                                            14
                                                                        }
                                                                        className="text-muted-foreground"
                                                                    />
                                                                )}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-foreground truncate">
                                                                    {
                                                                        client.name
                                                                    }
                                                                </p>
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {
                                                                        client.location
                                                                    }
                                                                </p>
                                                            </div>
                                                        </Link>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeClient.mutate(
                                                                    client.uuid,
                                                                    {
                                                                        onSuccess:
                                                                            () =>
                                                                                toast.success(
                                                                                    `${client.name} removed.`,
                                                                                ),
                                                                        onError:
                                                                            () =>
                                                                                toast.error(
                                                                                    "Failed to remove.",
                                                                                ),
                                                                    },
                                                                )
                                                            }
                                                            disabled={
                                                                removeClient.isPending
                                                            }
                                                            className="text-xs text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50 cursor-pointer"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2 bg-muted/20 rounded-lg border border-border/40">
                                                <p className="text-sm">
                                                    No clients assigned yet.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </Tab.Item>
                            )}
                        </Tab>
                    </div>
                </div>

                {/* ── Delete dialog ── */}
                <DeleteUserDialog
                    open={showDelete}
                    onOpenChange={setShowDelete}
                    userName={`${user?.first_name} ${user?.last_name}`}
                    isPending={deleteUser.isPending}
                    onDelete={handleDelete}
                />

                {/* ── Add Client Dialog ── */}
                <AssignClientDialog
                    open={showClientDialog}
                    onOpenChange={setShowClientDialog}
                    excludedUuids={assignedClientUuids}
                    secopLimit={secopLimit}
                    isAdding={addClient.isPending}
                    onAssignClient={(clientUuid, clientName) => {
                        if (!user?.email_verified_at) {
                            setShowClientDialog(false);
                            setShowVerifyRequired(true);
                            return;
                        }
                        addClient.mutate(clientUuid, {
                            onSuccess: () => {
                                toast.success(
                                    `${clientName} assigned successfully.`,
                                );
                                setShowClientDialog(false);
                            },
                            onError: () => {
                                toast.error("Failed to assign client.");
                            },
                        });
                    }}
                />

                <VerifyRequiredModal
                    open={showVerifyRequired}
                    onOpenChange={setShowVerifyRequired}
                    userName={user ? `${user.first_name} ${user.last_name}` : undefined}
                    userUuid={user?.uuid}
                />
            </div>
        </>
    );
}
