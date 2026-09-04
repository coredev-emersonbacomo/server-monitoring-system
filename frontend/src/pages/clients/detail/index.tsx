// MAO NI
// File Path: frontend\src\pages\clients\detail\index.tsx
import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
    Pencil,
    Upload,
    AlertTriangle,
    Trash2,
    Server,
    RefreshCw,
    Plus,
    Info,
    Shield,
    MapPin,
    Mail,
    Phone,
    Bell,
    Landmark,
    Search,
    Filter,
    ChevronDown,
    Wifi,
    WifiOff,
} from "lucide-react";
import { Form, createFormStore, useForm } from "@/components/ui/form";
import { toast } from "sonner";
import {
    useClient,
    useCreateClient,
    useUpdateClient,
    useDeleteClient,
    useClientServers,
    useClientSecops,
    useAddClientSecop,
    useRemoveClientSecop,
} from "@/hooks/useClients";
import { useAuth } from "@/hooks/useAuth";

import { useUsers } from "@/hooks/useUsers";
import { useSettings } from "@/hooks/useSettings";
import { Tab } from "@/components/ui/tab";
import IndexHeader from "@/components/IndexHeader";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floatingInput";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { uploadFile } from "@/lib/uploadToast";
import FormSkeleton from "./components/FormSkeleton";
import Field from "./components/Field";
import SectionHeader from "./components/SectionHeader";
import ServerCard from "./components/ServerCard";
import ServerCardSkeleton from "./components/ServerCardSkeleton";
import { DeleteClientDialog } from "./components/DeleteClientDialog";
import { AddSecopDialog } from "./components/AddSecopDialog";
import { clientSchema } from "./constants/schema";
import { useClientAlertTab } from "./hooks/useClientAlertTab";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { NodeConfigEditor } from "@/components/node-config/NodeConfigEditor";

// Helper function to format phone numbers
import {
    formatContactNumber,
    validateContactNumber,
} from "../utils/client-helper";
import { formatCurrency } from "@/utils/helpers";
import { useFormattedNumberInput } from "@/hooks/useFormattedNumberInput";
// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientDetail() {
    const navigate = useNavigate();
    const { uuid: clientUuid } = useParams<{ uuid: string }>();

    // ── Data fetching ──────────────────────────────────────────────────────────
    const { data: client, isLoading, isError } = useClient(clientUuid!);
    const { data: currentUser } = useAuth();
    useDocumentTitle(client?.name ?? undefined);

    const { data: servers = [], isLoading: serversLoading } = useClientServers(
        clientUuid!,
    );
    const { data: currentSecops = [], isLoading: secopLoading } =
        useClientSecops(clientUuid!);
    const { data: allUsers = [], isLoading: usersLoading } = useUsers();
    const { data: settings } = useSettings();
    const secopLimit = Math.max(
        1,
        parseInt(settings?.secop_limit_per_client ?? "2", 10) || 2,
    );
    const clientAlertTab = useClientAlertTab(
        clientUuid ?? "",
        client?.name ?? "",
        client?.alert_scope,
    );

    const { inputRef, formatValue, handleChange, handleKeyDown, handlePaste } = useFormattedNumberInput();

    // ── Mutations ──────────────────────────────────────────────────────────────
    const createClient = useCreateClient();
    const updateClient = useUpdateClient(clientUuid!);
    const deleteClient = useDeleteClient();
    const addSecop = useAddClientSecop(clientUuid!);
    const removeSecop = useRemoveClientSecop(clientUuid!);

    // ── Local state ────────────────────────────────────────────────────────────
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [showSecopDialog, setShowSecopDialog] = useState(false);
    const defaultBanner = import.meta.env.VITE_DEFAULT_CLIENT_BANNER as string;
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(
        clientUuid ? null : defaultBanner,
    );
    const [serverSearch, setServerSearch] = useState("");
    const [serverFilter, setServerFilter] = useState<
        | "all"
        | "online"
        | "offline"
        | "pending_installation"
        | "waiting_for_installation"
        | "pending_deletion"
        | "agent_uninstalled"
        | "archived"
    >("all");
    const isSaving = createClient.isPending || updateClient.isPending || isSubmitting;

    // ── Form store ─────────────────────────────────────────────────────────────
    const isCreate = !clientUuid;

    const store = useMemo(() => {
        if (isCreate) {
            return createFormStore({
                schema: clientSchema,
                originalData: {
                    name: "",
                    description: "",
                    location: "",
                    email: "",
                    contact_number: "",
                    budget: 0,
                },
                initialMode: "create",
            });
        }
        return createFormStore({
            schema: clientSchema,
            originalData: client
                ? {
                    name: client.name,
                    description: client.description ?? "",
                    location: client.location,
                    email: client.email,
                    contact_number: client.contact_number,
                    budget: client.budget ?? 0,
                }
                : {
                    name: "",
                    description: "",
                    location: "",
                    email: "",
                    contact_number: "",
                    budget: 0,
                },
            initialMode: "view",
        });
    }, [isCreate, client]);

    const form = useForm(store, (s) => s.form);
    const mode = useForm(store, (s) => s.mode);
    const errors = useForm(store, (s) => s.errors);
    const showEdit = mode !== "view";

    useEffect(() => {
        if (!client || isCreate) return;
        store.setState({
            form: {
                name: client.name,
                description: client.description ?? "",
                location: client.location,
                email: client.email,
                contact_number: client.contact_number,
                budget: client.budget ?? 0,
            },
            originalData: {
                name: client.name,
                description: client.description ?? "",
                location: client.location,
                email: client.email,
                contact_number: client.contact_number,
                budget: client.budget ?? 0,
            },
        });
        setBannerPreview(client.banner_image_url);
    }, [client, isCreate, store]);

    const hasChanges = useMemo(() => {
        if (isCreate) {
            return (
                form.name !== "" ||
                form.description !== "" ||
                form.location !== "" ||
                form.email !== "" ||
                form.contact_number !== "" ||
                (form.budget !== undefined && form.budget !== 0) ||
                bannerFile !== null
            );
        }
        if (!client) return false;
        const formChanged =
            form.name !== client.name ||
            form.description !== (client.description ?? "") ||
            form.location !== client.location ||
            form.email !== client.email ||
            form.contact_number !== client.contact_number ||
            Number(form.budget ?? 0) !== Number(client.budget ?? 0);
        return formChanged || bannerFile !== null;
    }, [form, client, bannerFile, isCreate]);

    const trail = useMemo(() => {
        if (isCreate) {
            return [
                { label: "Clients", href: "/clients" },
                { label: "Create" },
            ];
        } else if (client) {
            return [
                { label: "Clients", href: "/clients" },
                { label: client.name },
            ];
        }
        return [];
    }, [isCreate, client]);

    // ── Handlers ───────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (isSaving) return;

        const fd = new FormData();
        fd.append("name", form.name);
        fd.append("description", form.description ?? "");
        fd.append("location", form.location);
        fd.append("email", form.email);
        fd.append("contact_number", form.contact_number);
        fd.append("budget", String(form.budget ?? 0));

        if (bannerFile) {
            try {
                const { storage_key, intent_id } = await uploadFile(
                    bannerFile,
                    "client_banner",
                    "Uploading banner…",
                );
                fd.append("upload_intent_id", intent_id);
                fd.append("banner_image_storage_key", storage_key);
            } catch {
                toast.error("Failed to upload banner image.");
                return;
            }
        }

        if (!isCreate) {
            fd.append("_method", "PUT");
        }

        setIsSubmitting(true);
        try {
            if (isCreate) {
                await createClient.mutateAsync(fd);
                toast.success("Client created successfully.");
                navigate("/clients");
            } else {
                await updateClient.mutateAsync(fd);
                toast.success("Client updated successfully.");
                setBannerFile(null);
                store.setState({
                    form: { ...form },
                    originalData: { ...form },
                    errors: {},
                    externalDirty: false,
                });
                store.setMode("view");
            }
        } catch (err: unknown) {
            const data = err as Record<string, Record<string, string[]>>;
            if (data?.errors) {
                const mapped: Record<string, string> = {};
                for (const [k, v] of Object.entries(data.errors)) {
                    mapped[k] = Array.isArray(v) ? v[0] : String(v);
                }
                store.setState({ errors: mapped });
            } else {
                toast.error(
                    isCreate
                        ? "Failed to create client."
                        : "Failed to update client.",
                );
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteClient.mutateAsync(clientUuid!);
            toast.success("Client deleted.");
            navigate("/clients");
        } catch (err: unknown) {
            const e = err as {
                response?: { data?: { message?: string } };
                message?: string;
            };
            toast.error(
                e?.response?.data?.message ||
                e?.message ||
                "Failed to delete client.",
            );
        }
    };

    const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] ?? null;
        setBannerFile(file);
        if (file) {
            const reader = new FileReader();
            reader.onload = () => setBannerPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setBannerPreview(client?.banner_image_url ?? null);
        }
    };

    const cancelEdit = () => {
        store.setMode("view");
        if (client) {
            store.setState({
                form: {
                    name: client.name,
                    description: client.description ?? "",
                    location: client.location,
                    email: client.email,
                    contact_number: client.contact_number,
                    budget: client.budget ?? 0,
                },
            });
            setBannerPreview(client.banner_image_url);
            setBannerFile(null);
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
    if (!isCreate && (isError || (!isLoading && !client))) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <AlertTriangle size={32} className="opacity-40" />
                <p className="text-sm">Client not found.</p>
                <Button
                    variant="outline"
                    size="sm"
                    icon={<RefreshCw size={14} />}
                    label="Back to clients"
                    onClick={() => navigate("/clients")}
                />
            </div>
        );
    }

    // ── Derived state ──────────────────────────────────────────────────────────
    const hasBanner = !!bannerPreview;
    const bannerInputId = "banner-upload";
    const filteredServers = servers.filter((s) => {
        const matchSearch = s.name
            .toLowerCase()
            .includes(serverSearch.toLowerCase());
        if (!matchSearch) return false;

        const isArchived =
            s.record_status === "archived" || s.status === "archived";

        if (serverFilter === "archived") {
            return isArchived;
        }

        if (serverFilter === "all") {
            return !isArchived;
        }

        if (isArchived) return false;

        if (serverFilter === "pending_deletion") {
            return Boolean(s.agent_deleted);
        }

        if (serverFilter === "pending_installation") {
            return (
                (s.status === "pending_installation" || !s.status) &&
                !s.agent_deleted
            );
        }

        return s.status === serverFilter && !s.agent_deleted;
    });

    const availableSecops = allUsers.filter(
        (user) => !currentSecops.some((s) => s.uuid === user.uuid),
    );

    return (
        <>
            <LoadingOverlay visible={isSaving} />
            <div className="w-full flex flex-col min-h-0 bg-background text-foreground gap-6">
                {/* ── Breadcrumb ── */}
                <IndexHeader icon={Landmark} trail={trail} />

                {/* ── Banner / Hero ── */}
                <div className="relative overflow-hidden">
                    <div className="absolute -top-10 inset-x-0 bottom-0 overflow-hidden rounded-t-xl">
                        <div
                            className="w-full h-full"
                            style={
                                hasBanner
                                    ? {
                                        backgroundImage: `url(${bannerPreview})`,
                                        backgroundSize: "cover",
                                        backgroundPosition: "top center",
                                    }
                                    : {
                                        background:
                                            "linear-gradient(135deg, oklch(0.18 0.04 260 / 0.6), oklch(0.12 0.03 280 / 0.4))",
                                    }
                            }
                        />
                        <div className="absolute inset-0 bg-linear-to-t from-background via-background/70 to-transparent" />
                        <div className="absolute inset-0 bg-linear-to-r from-background/40 to-transparent" />
                    </div>

                    <div className="relative z-10 px-6 sm:px-8 lg:px-10 pt-6 pb-20 min-h-60">
                        {/* ── Name + actions ── */}
                        <div className="flex items-start justify-between gap-4 mb-6">
                            <div className="flex-1 min-w-0">
                                {showEdit ? (
                                    <div>
                                        <Label className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1">
                                            Name
                                        </Label>
                                        <input
                                            value={form.name}
                                            onChange={(e) =>
                                                store.set("name")(
                                                    e.target.value,
                                                )
                                            }
                                            placeholder="Client name"
                                            className="w-full text-2xl sm:text-3xl font-bold tracking-tight bg-transparent border-b-2 border-primary/50 outline-none pb-1 placeholder:text-muted-foreground/40 text-foreground"
                                        />
                                        {errors.name && (
                                            <p className="text-xs text-destructive mt-1">
                                                {errors.name}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <h1
                                        className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-all overflow-hidden line-clamp-2"
                                        title={client?.name}
                                    >
                                        {client?.name ?? "Client"}
                                    </h1>
                                )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {showEdit && (
                                    <>
                                        <label className="inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring h-8 px-3 py-1 border border-border bg-transparent hover:bg-muted text-foreground cursor-pointer">
                                            <Upload size={13} />
                                            Upload Banner Image
                                            <input
                                                id={bannerInputId}
                                                type="file"
                                                accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                                                onChange={handleBannerChange}
                                                className="hidden"
                                            />
                                        </label>
                                        {bannerFile && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setBannerFile(null);
                                                    setBannerPreview(
                                                        client?.banner_image_url ??
                                                        defaultBanner,
                                                    );
                                                    const input =
                                                        document.getElementById(
                                                            bannerInputId,
                                                        ) as HTMLInputElement;
                                                    if (input) input.value = "";
                                                }}
                                                className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                                            >
                                                Reset
                                            </button>
                                        )}
                                    </>
                                )}

                                {mode === "edit" && (
                                    <Button
                                        variant="danger"
                                        size="sm"
                                        icon={<Trash2 size={13} />}
                                        label="Delete"
                                        className="bg-red-600/70 cursor-pointer"
                                        onClick={() => setShowDelete(true)}
                                    />
                                )}

                                {mode !== "create" && !showEdit && (
                                    <Button
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
                                            form="client-detail-form"
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
                                            onClick={() => navigate("/clients")}
                                        />
                                        <Button
                                            className="cursor-pointer"
                                            type="submit"
                                            form="client-detail-form"
                                            size="sm"
                                            onClick={handleSubmit}
                                            disabled={isSaving}
                                            label={
                                                isSaving
                                                    ? "Saving…"
                                                    : "Create Client"
                                            }
                                        />
                                    </>
                                )}
                            </div>
                        </div>

                        {/* ── Description ── */}
                        <div className="mt-3 max-w-xl">
                            {showEdit ? (
                                <div>
                                    <Label className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1">
                                        Description
                                    </Label>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) =>
                                            store.set("description")(
                                                e.target.value,
                                            )
                                        }
                                        placeholder="Brief description about the client..."
                                        rows={2}
                                        maxLength={255}
                                        className={cn(
                                            "w-full rounded-md border border-input bg-background/60 backdrop-blur-sm px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none break-all",
                                            errors.description &&
                                            "border-destructive",
                                        )}
                                    />
                                    {errors.description && (
                                        <p className="text-xs text-destructive mt-1">
                                            {errors.description}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                client?.description && (
                                    <div className="w-full max-w-full px-6">
                                        <p className="text-sm text-muted-foreground/85 break-all whitespace-pre-wrap">
                                            {client.description}
                                        </p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Content ── */}
                <div className="flex-1 -mt-12 relative z-20 px-6 sm:px-8 lg:px-10 py-6">
                    <div className="max-w-7xl mx-auto relative flex flex-col gap-6">
                        <Tab>
                            <Tab.Item icon={Info} title="Details">
                                <Form.Root
                                    store={store}
                                    id="client-detail-form"
                                    className="bg-card border border-border/60 shadow-sm p-6 sm:p-8 flex flex-col gap-8"
                                >
                                    <Form.SubmitHandler
                                        handler={handleSubmit}
                                    />
                                    {/* Basic Information */}
                                    <section className="space-y-4">
                                        <SectionHeader
                                            title="Basic Information"
                                            description="Core details about this client account."
                                        />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {showEdit ? (
                                                <FloatingInput
                                                    label="Location"
                                                    value={form.location}
                                                    onValueChange={store.set(
                                                        "location",
                                                    )}
                                                    error={errors.location}
                                                />
                                            ) : (
                                                <Field
                                                    label="Location"
                                                    icon={MapPin}
                                                    required
                                                    isEdit={showEdit}
                                                >
                                                    <p className="text-base font-semibold text-foreground py-1">
                                                        {client?.location}
                                                    </p>
                                                </Field>
                                            )}
                                        </div>
                                    </section>

                                    <div className="h-px bg-border" />

                                    {/* Contact Details */}
                                    <section className="space-y-4">
                                        <SectionHeader
                                            title="Contact Details"
                                            description="How to reach this client."
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
                                                    icon={Mail}
                                                    required
                                                    isEdit={showEdit}
                                                >
                                                    <p className="text-base font-semibold text-foreground ">
                                                        {client?.email}
                                                    </p>
                                                </Field>
                                            )}

                                            {showEdit ? (
                                                <FloatingInput
                                                    label="Contact Number"
                                                    value={form.contact_number}
                                                    maxLength={15}
                                                    onValueChange={(value) => {
                                                        const cleaned =
                                                            formatContactNumber(
                                                                value,
                                                            );
                                                        store.set(
                                                            "contact_number",
                                                        )(cleaned);

                                                        // Live validation
                                                        const message =
                                                            validateContactNumber(
                                                                cleaned,
                                                            );
                                                        store.setState({
                                                            errors: {
                                                                ...errors,
                                                                contact_number:
                                                                    message ??
                                                                    "",
                                                            },
                                                        });
                                                    }}
                                                    error={
                                                        errors.contact_number
                                                    }
                                                />
                                            ) : (
                                                <Field
                                                    label="Contact Number"
                                                    icon={Phone}
                                                    required
                                                    isEdit={showEdit}
                                                >
                                                    <p className="text-base font-semibold text-foreground">
                                                        {formatContactNumber(
                                                            client?.contact_number,
                                                        ) || ""}
                                                    </p>
                                                </Field>
                                            )}
                                        </div>
                                    </section>

                                    <div className="h-px bg-border" />

                                    {/* Financial & Subscription Details */}
                                    <section className="space-y-4">
                                        <SectionHeader
                                            title="Financial & Subscription"
                                            description="Budget limit and combined server subscription fees."
                                        />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {showEdit ? (
                                                <FloatingInput
                                                    type="text"
                                                    inputMode="decimal"
                                                    label="Monthly Budget (₱)"
                                                    value={formatValue(String(form.budget ?? 0))}
                                                    onValueChange={(val) => {
                                                        const el = inputRef.current;
                                                        const cursorPos = el?.selectionStart ?? val.length;
                                                        handleChange(val, cursorPos, (unformatted) => {
                                                            store.set("budget")(unformatted);
                                                        });
                                                    }}
                                                    onKeyDown={handleKeyDown}
                                                    onPaste={handlePaste}
                                                    error={errors.budget}
                                                />
                                            ) : (
                                                <Field
                                                    label="Monthly Budget"
                                                    icon={Landmark}
                                                    isEdit={showEdit}
                                                >
                                                    <p className="text-base font-semibold text-foreground">
                                                        {formatCurrency(client?.budget, { suffix: " / mo" })}
                                                    </p>
                                                </Field>
                                            )}

                                            {!isCreate && (
                                                <Field
                                                    label="Total Server Subscription Fee"
                                                    icon={Landmark}
                                                    isEdit={false}
                                                >
                                                    <p className="text-base font-semibold text-foreground">
                                                        {formatCurrency(client?.total_subscription_fee, { suffix: " / mo" })}
                                                    </p>
                                                </Field>
                                            )}
                                        </div>
                                    </section>
                                </Form.Root>
                            </Tab.Item>

                            {mode === "view" && client && (
                                <Tab.Item icon={Shield} title="Sec Ops">
                                    <div className="bg-card border border-border/60 shadow-sm p-6 sm:p-8 flex flex-col gap-8">
                                        <div className="flex items-center justify-between mb-6">
                                            <div>
                                                <h2 className="text-base font-semibold text-foreground">
                                                    SecOps Assignments
                                                </h2>
                                                <p className="text-xs text-muted-foreground mt-0.5">
                                                    Manage SecOps personnel
                                                    assigned to this client.
                                                </p>
                                            </div>
                                            <Button
                                                className="cursor-pointer"
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                icon={<Plus size={14} />}
                                                label="Add SecOps"
                                                onClick={() =>
                                                    setShowSecopDialog(true)
                                                }
                                                disabled={
                                                    currentSecops.length >=
                                                    secopLimit
                                                }
                                            />
                                        </div>

                                        {secopLoading ? (
                                            <div className="space-y-2">
                                                {[0, 1, 2].map((i) => (
                                                    <div
                                                        key={i}
                                                        className="h-10 bg-muted rounded animate-pulse"
                                                    />
                                                ))}
                                            </div>
                                        ) : currentSecops.length > 0 ? (
                                            <div className="space-y-2">
                                                {currentSecops.map((secop) => (
                                                    <div
                                                        key={secop.uuid}
                                                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors"
                                                    >
                                                        <div
                                                            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity"
                                                            onClick={() =>
                                                                navigate(
                                                                    `/users/${secop.uuid}`,
                                                                )
                                                            }
                                                        >
                                                            <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0">
                                                                <img
                                                                    src={
                                                                        secop.profile_picture_url
                                                                    }
                                                                    alt={`${secop.first_name} ${secop.last_name}`}
                                                                    className="h-full w-full object-cover"
                                                                    onError={(
                                                                        e,
                                                                    ) => {
                                                                        (
                                                                            e.target as HTMLImageElement
                                                                        ).style.display =
                                                                            "none";
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-foreground truncate">
                                                                    {
                                                                        secop.first_name
                                                                    }{" "}
                                                                    {
                                                                        secop.last_name
                                                                    }
                                                                    {
                                                                        secop.uuid === currentUser?.uuid && (
                                                                            <span className="text-[12px] font-semibold ml-1 text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shrink-0">
                                                                                (You)
                                                                            </span>
                                                                        )
                                                                    }
                                                                </p>
                                                                <p className="text-xs text-muted-foreground truncate">
                                                                    {
                                                                        secop.email
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeSecop.mutate(
                                                                    secop.uuid,
                                                                    {
                                                                        onSuccess:
                                                                            () => {
                                                                                toast.error(
                                                                                    `${secop.first_name} removed from ${client?.name}.`,
                                                                                );
                                                                            },
                                                                        onError:
                                                                            () => {
                                                                                toast.error(
                                                                                    "Failed to remove SecOps.",
                                                                                );
                                                                            },
                                                                    },
                                                                )
                                                            }
                                                            disabled={
                                                                removeSecop.isPending
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
                                                    No SecOps assigned yet.
                                                </p>
                                                <p className="text-xs">
                                                    Add up to{" "}
                                                    <span className="font-semibold">
                                                        {secopLimit}
                                                    </span>{" "}
                                                    SecOps to this client.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </Tab.Item>
                            )}

                            {mode === "view" && client && (
                                <Tab.Item icon={Bell} title="Alerts">
                                    <div className="bg-card border border-border/60 shadow-sm p-6 sm:p-8 flex flex-col gap-6">
                                        <div>
                                            <label className="text-sm font-medium text-foreground">
                                                Alert Scope
                                            </label>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                Choose which alert configuration
                                                applies to this client's
                                                servers.
                                            </p>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="alertScope"
                                                        value="global"
                                                        checked={
                                                            clientAlertTab.alertScope ===
                                                            "global"
                                                        }
                                                        onChange={() =>
                                                            clientAlertTab.setAlertScope(
                                                                "global",
                                                            )
                                                        }
                                                        className="accent-primary"
                                                    />
                                                    <span className="text-sm">
                                                        Global
                                                    </span>
                                                </label>
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="alertScope"
                                                        value="client"
                                                        checked={
                                                            clientAlertTab.alertScope ===
                                                            "client"
                                                        }
                                                        onChange={() =>
                                                            clientAlertTab.setAlertScope(
                                                                "client",
                                                            )
                                                        }
                                                        className="accent-primary"
                                                    />
                                                    <span className="text-sm">
                                                        Client
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                        <NodeConfigEditor
                                            configKey={clientAlertTab.configKey}
                                            scopeLabel={client?.name ?? ""}
                                            showControls={false}
                                            showMinimap={false}
                                            showNodeTypesSidebar={false}
                                        />
                                    </div>
                                </Tab.Item>
                            )}
                        </Tab>

                        {mode === "view" && client && (
                            <section>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h2 className="text-base font-semibold text-foreground">
                                            Servers
                                        </h2>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {client.servers_count > 0
                                                ? `${client.servers_count} server${client.servers_count !== 1 ? "s" : ""} associated with this client.`
                                                : "No servers are currently associated with this client."}
                                        </p>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <Search
                                                size={14}
                                                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Search servers..."
                                                value={serverSearch}
                                                onChange={(e) =>
                                                    setServerSearch(
                                                        e.target.value,
                                                    )
                                                }
                                                className="w-48 pl-8 pr-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground transition-colors"
                                            />
                                        </div>
                                        {/* Dara */}
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    icon={<Filter size={14} />}
                                                    className="gap-1 cursor-pointer"
                                                >
                                                    {
                                                        [
                                                            { label: "All", value: "all" },
                                                            { label: "Online", value: "online" },
                                                            { label: "Offline", value: "offline" },
                                                            { label: "Pending Installation", value: "pending_installation" },
                                                            { label: "Waiting For Installation", value: "waiting_for_installation" },
                                                            { label: "Pending Deletion", value: "pending_deletion" },
                                                            { label: "Agent Uninstalled", value: "agent_uninstalled" },
                                                            { label: "Archived", value: "archived" },
                                                        ].find((o) => o.value === serverFilter)
                                                            ?.label ?? "All"
                                                    }
                                                    <ChevronDown size={14} />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                align="end"
                                                className="w-52 p-1"
                                            >
                                                {[
                                                    { label: "All", value: "all" },
                                                    {
                                                        label: "Online",
                                                        value: "online",
                                                        icon: <Wifi className="size-3 text-emerald-400" />,
                                                    },
                                                    {
                                                        label: "Offline",
                                                        value: "offline",
                                                        icon: <WifiOff className="size-3 text-red-400" />,
                                                    },
                                                    {
                                                        label: "Pending Installation",
                                                        value: "pending_installation",
                                                        icon: <AlertTriangle className="size-3 text-slate-400" />,
                                                    },
                                                    {
                                                        label: "Waiting For Installation",
                                                        value: "waiting_for_installation",
                                                        icon: <AlertTriangle className="size-3 text-amber-400 animate-pulse" />,
                                                    },
                                                    {
                                                        label: "Pending Deletion",
                                                        value: "pending_deletion",
                                                        icon: <Trash2 className="size-3 text-orange-400" />,
                                                    },
                                                    {
                                                        label: "Agent Uninstalled",
                                                        value: "agent_uninstalled",
                                                        icon: <WifiOff className="size-3 text-red-400" />,
                                                    },
                                                    {
                                                        label: "Archived",
                                                        value: "archived",
                                                        icon: <Trash2 className="size-3 text-slate-400" />,
                                                    },
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() =>
                                                            setServerFilter(
                                                                opt.value as typeof serverFilter,
                                                            )
                                                        }
                                                        className={cn(
                                                            "flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
                                                            serverFilter ===
                                                                opt.value
                                                                ? "bg-accent text-accent-foreground"
                                                                : "hover:bg-muted text-foreground",
                                                        )}
                                                    >
                                                        {opt.icon}
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </PopoverContent>
                                        </Popover>

                                        <Link
                                            to={`/servers?client_uuid=${client?.uuid}`}
                                        >
                                            <Button
                                                className="cursor-pointer"
                                                variant="outline"
                                                size="sm"
                                                label="View All"
                                            />
                                        </Link>
                                        <Link
                                            to={`/servers/create?client_uuid=${client?.uuid}`}
                                        >
                                            <Button
                                                className="cursor-pointer"
                                                variant="outline"
                                                size="sm"
                                                icon={<Plus size={14} />}
                                                label="Add Server"
                                            />
                                        </Link>
                                    </div>
                                </div>

                                {serversLoading ? (
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                                        {Array.from({
                                            length: Math.min(
                                                client.servers_count || 2,
                                                4,
                                            ),
                                        }).map((_, i) => (
                                            <ServerCardSkeleton key={i} />
                                        ))}
                                    </div>
                                ) : filteredServers.length > 0 ? (
                                    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
                                        {filteredServers.map((s) => (
                                            <ServerCard
                                                key={s.uuid}
                                                server={s}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2 bg-card border border-border/60 rounded-xl">
                                        <Server
                                            size={28}
                                            className="opacity-20"
                                        />
                                        <p className="text-sm">
                                            No servers assigned to this client.
                                        </p>
                                    </div>
                                )}
                            </section>
                        )}
                    </div>
                </div>

                {/* ── Delete dialog ── */}
                <DeleteClientDialog
                    open={showDelete}
                    onOpenChange={setShowDelete}
                    clientName={client?.name}
                    servers={servers}
                    isPending={deleteClient.isPending}
                    onDelete={handleDelete}
                />

                {/* ── SecOps Dialog ── */}
                <AddSecopDialog
                    open={showSecopDialog}
                    onOpenChange={setShowSecopDialog}
                    clientName={client?.name}
                    secopLimit={secopLimit}
                    availableSecops={availableSecops}
                    isLoading={usersLoading}
                    isAdding={addSecop.isPending}
                    onAddSecop={(userUuid, userName) => {
                        addSecop.mutate(userUuid, {
                            onSuccess: () => {
                                toast.success(
                                    `${userName} added to ${client?.name}.`,
                                );
                                setShowSecopDialog(false);
                            },
                            onError: () => {
                                toast.error(
                                    "Failed to add SecOps. You may have reached the limit.",
                                );
                            },
                        });
                    }}
                />
            </div>
        </>
    );
}
