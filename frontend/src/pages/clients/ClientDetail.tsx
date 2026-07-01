import { useState, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
    Pencil,
    Upload,
    AlertTriangle,
    Trash2,
    Server,
    Monitor,
    Cpu,
    MemoryStick,
    Globe,
    RefreshCw,
    Network,
    Plus,
    Loader2,
} from "lucide-react";
import { z } from "zod";
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
import type { components } from "@/api/schema.d";

import { useUsers } from "@/hooks/useUsers";
import { useSettings } from "@/hooks/useSettings";
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
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { uploadFile } from "@/lib/uploadToast";

import { Search, Filter, ChevronDown } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

// Helper function to format phone numbers
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
    isEdit = true,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
    error?: string;
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

// ─── Server card ──────────────────────────────────────────────────────────────

function ServerCard({
    server,
}: {
    server: components["schemas"]["ServerData"];
}) {
    return (
        <Link
            to={`/servers/${server.uuid}`}
            className="bg-card border border-border/60 rounded-xl shadow-sm p-5 flex flex-col gap-3 transition-shadow hover:shadow-md group"
        >
            <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Monitor className="w-5 h-5 text-primary" />
                </div>
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Online
                </span>
            </div>

            <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {server.server_name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {server.device_name}
                </p>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-mono">
                    <Network size={11} />
                    {server.external_ip}
                </span>
                {server.operating_system && (
                    <span className="flex items-center gap-1">
                        <Globe size={11} />
                        {server.operating_system}
                    </span>
                )}
            </div>

            {(server.cpu_cores || server.ram) && (
                <div className="flex gap-3 text-xs text-muted-foreground pt-1 border-t border-border/40">
                    {server.cpu_cores && (
                        <span className="flex items-center gap-1">
                            <Cpu size={11} />
                            {server.cpu_cores} cores
                        </span>
                    )}
                    {server.ram && (
                        <span className="flex items-center gap-1">
                            <MemoryStick size={11} />
                            {server.ram} GB
                        </span>
                    )}
                </div>
            )}
        </Link>
    );
}

function ServerCardSkeleton() {
    return (
        <div className="bg-card border border-border/60 rounded-xl p-5 flex flex-col gap-3 animate-pulse">
            <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-muted" />
                <div className="w-10 h-3 bg-muted rounded" />
            </div>
            <div className="h-4 w-28 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-3 w-32 bg-muted rounded" />
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientDetail() {
    const navigate = useNavigate();
    const { uuid: clientUuid } = useParams<{ uuid: string }>();
    const { setTrail } = useBreadcrumb();

    const [activeTab, setActiveTab] = useState<"details" | "secops">("details");
    const [mode, setMode] = useState<"view" | "create" | "edit">(
        clientUuid ? "view" : "create",
    );
    const showEdit = mode !== "view";

    // ── Data fetching ──────────────────────────────────────────────────────────
    const { data: client, isLoading, isError } = useClient(clientUuid!);
    const { data: servers = [], isLoading: serversLoading } = useClientServers(
        clientUuid!,
    );
    const { data: currentSecops = [], isLoading: secopLoading } =
        useClientSecops(clientUuid!);
    const { data: allUsers = [], isLoading: usersLoading } = useUsers();
    const { data: settings } = useSettings();
    const secopLimit = Math.max(
        1,
        parseInt(settings?.secop_limit_per_client ?? "5", 10) || 5,
    );

    // ── Mutations ──────────────────────────────────────────────────────────────
    const createClient = useCreateClient();
    const updateClient = useUpdateClient(clientUuid!);
    const deleteClient = useDeleteClient();
    const addSecop = useAddClientSecop(clientUuid!);
    const removeSecop = useRemoveClientSecop(clientUuid!);

    // ── Local state ────────────────────────────────────────────────────────────
    const [showDelete, setShowDelete] = useState(false);
    const [showSecopDialog, setShowSecopDialog] = useState(false);
    const [selectedSecopToAdd, setSelectedSecopToAdd] = useState<number | null>(
        null,
    );
    const defaultBanner = import.meta.env.VITE_DEFAULT_CLIENT_BANNER as string;
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(
        clientUuid ? null : defaultBanner,
    );
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Add state inside the component
    const [serverSearch, setServerSearch] = useState("");
    const [serverFilter, setServerFilter] = useState<
        "all" | "online" | "offline"
    >("all");

    const [form, setForm] = useState({
        name: "",
        description: "",
        location: "",
        email: "",
        contact_number: "",
    });

    // Reset mode when navigating between clients / to create
    useEffect(() => {
        const next = clientUuid ? "view" : "create";
        setMode(next);
        if (next === "create") {
            setForm({
                name: "",
                description: "",
                location: "",
                email: "",
                contact_number: "",
            });
            setBannerPreview(defaultBanner);
            setBannerFile(null);
            setErrors({});
        }
    }, [defaultBanner, clientUuid]);

    // Populate form when client data arrives
    useEffect(() => {
        if (client) {
            setForm({
                name: client.name,
                description: client.description ?? "",
                location: client.location,
                email: client.email,
                contact_number: client.contact_number,
            });
            setBannerPreview(client.banner_image_url);
        }
    }, [client]);

    // Breadcrumb
    useEffect(() => {
        if (mode === "create") {
            setTrail([
                { label: "Clients", href: "/clients" },
                { label: "Create", href: "/clients/create" },
            ]);
        } else if (client) {
            setTrail([
                { label: "Clients", href: "/clients" },
                { label: client.name, href: `/clients/${client.uuid}` },
            ]);
        }
    }, [setTrail, mode, client]);

    const set =
        (key: keyof typeof form) =>
            (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
                setForm((f) => ({ ...f, [key]: e.target.value }));

    // ── Validation ─────────────────────────────────────────────────────────────
    const schema = z.object({
        name: z.string().trim().min(2, "Minimum 2 characters"),
        description: z.string().optional(),
        location: z.string().trim().min(2, "Minimum 2 characters"),
        email: z.email("Invalid email address").trim().min(1, "Required"),
        contact_number: z.string().trim().min(5, "Minimum 5 characters"),
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
    const handleSubmit = async (e: React.SubmitEvent) => {
        e.preventDefault();
        if (!validate()) return;

        const fd = new FormData();
        fd.append("name", form.name);
        fd.append("description", form.description);
        fd.append("location", form.location);
        fd.append("email", form.email);
        fd.append("contact_number", form.contact_number);

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

        if (mode !== "create") {
            fd.append("_method", "PUT");
        }

        try {
            if (mode === "create") {
                await createClient.mutateAsync(fd);
                toast.success("Client created successfully.");
                navigate("/clients");
            } else {
                await updateClient.mutateAsync(fd);
                toast.success("Client updated successfully.");
                setMode("view");
            }
        } catch (err: unknown) {
            const data = err as Record<string, Record<string, string[]>>;
            if (data?.errors) {
                const mapped: Record<string, string> = {};
                for (const [k, v] of Object.entries(data.errors)) {
                    mapped[k] = Array.isArray(v) ? v[0] : String(v);
                }
                setErrors(mapped);
            } else {
                toast.error(
                    mode === "create"
                        ? "Failed to create client."
                        : "Failed to update client.",
                );
            }
        }
    };

    const handleDelete = async () => {
        try {
            await deleteClient.mutateAsync(clientUuid!);
            toast.success("Client deleted.");
            navigate("/clients");
        } catch {
            toast.error("Failed to delete client.");
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
        setMode("view");
        setErrors({});
        if (client) {
            setForm({
                name: client.name,
                description: client.description ?? "",
                location: client.location,
                email: client.email,
                contact_number: client.contact_number,
            });
            setBannerPreview(client.banner_image_url);
            setBannerFile(null);
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
    if (mode !== "create" && (isError || (!isLoading && !client))) {
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
    const isSaving = createClient.isPending || updateClient.isPending;
    const bannerInputId = "banner-upload";
    const filteredServers = servers.filter((s) => {
        const matchSearch = s.server_name
            .toLowerCase()
            .includes(serverSearch.toLowerCase());
        return matchSearch;
    });

    return (
        <>
            <LoadingOverlay visible={isSaving} />
            <div className="w-full flex flex-col min-h-0 bg-background text-foreground">
                {/* ── Banner / Hero ── */}
                <div className="relative">
                    <div className="absolute inset-0 overflow-hidden rounded-t-xl">
                        <div
                            className="w-full h-full"
                            style={
                                hasBanner
                                    ? {
                                        backgroundImage: `url(${bannerPreview})`,
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
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

                    <div className="relative z-10 px-6 sm:px-8 lg:px-10 pt-6 pb-20">
                        {/* ── Top bar: back + actions ── */}
                        <div className="flex items-center justify-end mb-6">
                            <div className="flex items-center gap-2">
                                {/* Upload — always accessible */}
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
                                        onClick={() => navigate("/clients")}
                                    />
                                )}
                            </div>
                        </div>

                        {/* ── Name ── */}
                        <div className="flex-1 min-w-0">
                            {showEdit ? (
                                <div>
                                    <Label className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1">
                                        Name
                                    </Label>
                                    <input
                                        value={form.name}
                                        onChange={set("name")}
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
                                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                    {client?.name ?? "Client"}
                                </h1>
                            )}
                        </div>

                        {/* ── Description (always in banner) ── */}
                        <div className="mt-3 max-w-xl">
                            {showEdit ? (
                                <div>
                                    <Label className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1">
                                        Description
                                    </Label>
                                    <textarea
                                        value={form.description}
                                        onChange={set("description")}
                                        placeholder="Brief description about the client..."
                                        rows={2}
                                        className={cn(
                                            "w-full rounded-md border border-input bg-background/60 backdrop-blur-sm px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none",
                                            errors.description &&
                                            "border-destructive",
                                        )}
                                    />
                                </div>
                            ) : (
                                client?.description && (
                                    <p className="text-sm text-muted-foreground">
                                        {client.description}
                                    </p>
                                )
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Content ── */}
                <div className="flex-1 -mt-12 relative z-20 px-6 sm:px-8 lg:px-10 pb-8">
                    <div className="max-w-3xl mx-auto relative flex flex-col gap-6">
                        {/* Floating Tabs */}
                        <div className="absolute -top-11 right-0 z-30">
                            <div className="inline-flex rounded-t-xl border border-border border-b-0 bg-card p-1">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("details")}
                                    className={cn(
                                        "px-4 py-2 text-sm rounded-md transition-colors cursor-pointer",
                                        activeTab === "details"
                                            ? "text-foreground cursor-default"
                                            : "bg-background shadow text-muted-foreground cursor-pointer hover:text-foreground"
                                    )}
                                >
                                    Details
                                </button>

                                {mode !== "create" && (
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("secops")}
                                        className={cn(
                                            "px-4 py-2 text-sm rounded-md transition-colors cursor-pointer",
                                            activeTab === "secops"
                                                ? "text-foreground cursor-default"
                                                : "bg-background shadow text-muted-foreground cursor-pointer hover:text-foreground"
                                        )}
                                    >
                                        Assign SecOps
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Floating tabs */}
                        <form
                            onSubmit={handleSubmit}
                            className="bg-card border border-border/60 rounded-tl-xl rounded-bl-xl rounded-br-xl shadow-sm p-6 sm:p-8 flex flex-col gap-8"
                        >
                            {/* Basic Information */}

                            {activeTab === "details" && (
                                <>
                                    <section className="space-y-4">
                                        <SectionHeader
                                            title="Basic Information"
                                            description="Core details about this client account."
                                        />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <Field
                                                label="Location"
                                                required
                                                error={errors.location}
                                                isEdit={showEdit}
                                            >
                                                {showEdit ? (
                                                    <Input
                                                        placeholder="New York, USA"
                                                        value={form.location}
                                                        onChange={set(
                                                            "location",
                                                        )}
                                                        className={cn(
                                                            errors.location &&
                                                            "border-destructive",
                                                        )}
                                                    />
                                                ) : (
                                                    <p className="text-sm text-foreground py-1">
                                                        {client?.location}
                                                    </p>
                                                )}
                                            </Field>
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
                                            <Field
                                                label="Email Address"
                                                required
                                                error={errors.email}
                                                isEdit={showEdit}
                                            >
                                                {showEdit ? (
                                                    <Input
                                                        type="email"
                                                        placeholder="contact@acme.com"
                                                        value={form.email}
                                                        onChange={set("email")}
                                                        className={cn(
                                                            errors.email &&
                                                            "border-destructive",
                                                        )}
                                                    />
                                                ) : (
                                                    <p className="text-sm text-foreground py-1">
                                                        {client?.email}
                                                    </p>
                                                )}
                                            </Field>
                                            <Field
                                                label="Contact Number"
                                                required
                                                error={errors.contact_number}
                                                isEdit={showEdit}
                                            >
                                                {showEdit ? (
                                                    <Input
                                                        placeholder="e.g. 09123456789"
                                                        value={
                                                            form.contact_number
                                                        }
                                                        onChange={(e) => {
                                                            set(
                                                                "contact_number",
                                                            )({
                                                                ...e,
                                                                target: {
                                                                    ...e.target,
                                                                    value: formatPhoneNumber(
                                                                        e.target
                                                                            .value,
                                                                    ),
                                                                },
                                                            });
                                                        }}
                                                        className={cn(
                                                            errors.contact_number &&
                                                            "border-destructive",
                                                        )}
                                                    />
                                                ) : (
                                                    <p className="text-sm text-foreground py-1">
                                                        {formatPhoneNumber(
                                                            client?.contact_number ||
                                                            "",
                                                        )}
                                                    </p>
                                                )}
                                            </Field>
                                        </div>
                                    </section>

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
                                                            : mode === "create"
                                                                ? "Create Client"
                                                                : "Save Changes"
                                                    }
                                                />
                                            </div>
                                        </>
                                    )}
                                </>
                            )}

                            {activeTab === "secops" &&
                                mode !== "create" &&
                                client && (
                                    <>
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
                                                        key={secop.id}
                                                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors"
                                                    >
                                                        <div className="flex items-center gap-3 flex-1 min-w-0">
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
                                                                    secop.id,
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
                                                            className="text-xs text-destructive hover:text-destructive/80 transition-colors disabled:opacity-50"
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
                                    </>
                                )}
                        </form>

                        {mode !== "create" && client && (
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

                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    icon={<Filter size={14} />}
                                                    className="gap-1"
                                                >
                                                    {serverFilter === "all"
                                                        ? "All"
                                                        : serverFilter ===
                                                            "online"
                                                            ? "Online"
                                                            : "Offline"}
                                                    <ChevronDown size={14} />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                align="end"
                                                className="w-36 p-1"
                                            >
                                                {[
                                                    {
                                                        label: "All",
                                                        value: "all",
                                                    },
                                                    {
                                                        label: "Online",
                                                        value: "online",
                                                    },
                                                    {
                                                        label: "Offline",
                                                        value: "offline",
                                                    },
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() =>
                                                            setServerFilter(
                                                                opt.value as
                                                                | "all"
                                                                | "online"
                                                                | "offline",
                                                            )
                                                        }
                                                        className={cn(
                                                            "flex items-center w-full px-2 py-1.5 rounded-md text-sm transition-colors",
                                                            serverFilter ===
                                                                opt.value
                                                                ? "bg-accent text-accent-foreground"
                                                                : "hover:bg-muted text-foreground",
                                                        )}
                                                    >
                                                        {opt.label}
                                                    </button>
                                                ))}
                                            </PopoverContent>
                                        </Popover>

                                        <Link
                                            to={`/servers?client_uuid=${client.uuid}`}
                                        >
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                label="View All"
                                            />
                                        </Link>
                                        <Link
                                            to={`/servers/create?client_uuid=${client.uuid}`}
                                        >
                                            <Button
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
                <Dialog open={showDelete} onOpenChange={setShowDelete}>
                    <DialogContent className="sm:max-w-sm">
                        <DialogHeader>
                            <DialogTitle>Delete Client</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground">
                            This will permanently delete{" "}
                            <strong className="text-foreground">
                                {client?.name}
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
                                    deleteClient.isPending
                                        ? "Deleting…"
                                        : "Delete"
                                }
                                disabled={deleteClient.isPending}
                                onClick={handleDelete}
                            />
                        </div>
                    </DialogContent>
                </Dialog>

                {/* ── SecOps Dialog ── */}
                <Dialog
                    open={showSecopDialog}
                    onOpenChange={setShowSecopDialog}
                >
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>Add SecOps</DialogTitle>
                        </DialogHeader>
                        <div className="flex flex-col gap-4">
                            <p className="text-xs text-muted-foreground">
                                Select a SecOps account to assign to this
                                client. You can add up to{" "}
                                <span className="font-semibold">
                                    {settings?.secop_limit_per_client ?? "5"}
                                </span>{" "}
                                SecOps per client.
                            </p>

                            {usersLoading ? (
                                <div className="space-y-2">
                                    {[0, 1, 2].map((i) => (
                                        <div
                                            key={i}
                                            className="h-10 bg-muted rounded animate-pulse"
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {allUsers
                                        .filter(
                                            (user) =>
                                                !currentSecops.some(
                                                    (s) => s.id === user.id,
                                                ),
                                        )
                                        .map((user) => (
                                            <button
                                                key={user.id}
                                                onClick={() => {
                                                    setSelectedSecopToAdd(
                                                        user.id,
                                                    );
                                                    addSecop.mutate(user.id, {
                                                        onSuccess: () => {
                                                            toast.success(
                                                                `${user.first_name} added to ${client?.name}.`,
                                                            );
                                                            setShowSecopDialog(
                                                                false,
                                                            );
                                                            setSelectedSecopToAdd(
                                                                null,
                                                            );
                                                        },
                                                        onError: () => {
                                                            toast.error(
                                                                "Failed to add SecOps. You may have reached the limit.",
                                                            );
                                                        },
                                                    });
                                                }}
                                                disabled={
                                                    addSecop.isPending ||
                                                    selectedSecopToAdd ===
                                                    user.id
                                                }
                                                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 text-left border border-border/40 hover:border-border"
                                            >
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-muted shrink-0">
                                                        <img
                                                            src={
                                                                user.profile_picture_url
                                                            }
                                                            alt={`${user.first_name} ${user.last_name}`}
                                                            className="h-full w-full object-cover"
                                                            onError={(e) => {
                                                                (
                                                                    e.target as HTMLImageElement
                                                                ).style.display =
                                                                    "none";
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-foreground truncate">
                                                        {user.first_name}{" "}
                                                        {user.last_name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {user.email}
                                                    </p>
                                                </div>
                                                {selectedSecopToAdd ===
                                                    user.id &&
                                                    addSecop.isPending && (
                                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                                    )}
                                            </button>
                                        ))}
                                    {allUsers.filter(
                                        (user) =>
                                            !currentSecops.some(
                                                (s) => s.id === user.id,
                                            ),
                                    ).length === 0 && (
                                            <p className="text-sm text-muted-foreground text-center py-4">
                                                All users are already assigned to
                                                this client.
                                            </p>
                                        )}
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <DialogClose asChild>
                                <Button
                                    variant="outline"
                                    label="Close"
                                    onClick={() => setShowSecopDialog(false)}
                                />
                            </DialogClose>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}
