import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";
import {
    Pencil,
    Upload,
    AlertTriangle,
    Trash2,
    Server,
    RefreshCw,
    Plus,
    Loader2,
    Info,
    Shield,
    MapPin,
    Mail,
    Phone,
    Bell,
    Banknote,
    Coins,
    Clock,
    History,
    Calendar,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";

function formatUptime(seconds: number): string {
    if (!seconds || seconds <= 0) return "0s";
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
}
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

import { useUsers } from "@/hooks/useUsers";
import { useSettings } from "@/hooks/useSettings";
import { Tab } from "@/components/ui/tab";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floatingInput";
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
import FormSkeleton from "@/components/clientDetails/FormSkeleton";
import Field from "@/components/clientDetails/Field";
import SectionHeader from "@/components/clientDetails/SectionHeader";
import ServerCard from "@/components/clientDetails/ServerCard";
import ServerCardSkeleton from "@/components/clientDetails/ServerCardSkeleton";

import { Search, Filter, ChevronDown } from "lucide-react";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { NodeConfigEditor } from "@/components/node-config/NodeConfigEditor";

// Helper function to format phone numbers
import { formatPhoneNumber } from "@/utils/helpers";

// ─── Client Alert Tab ────────────────────────────────────────────────────────

function useClientAlertTab(
    clientUuid: string,
    clientName: string,
    initialScope?: string,
) {
    const queryClient = useQueryClient();
    const [alertScope, setAlertScopeState] = useState<"global" | "client">(
        "global",
    );
    const hydratedRef = useRef(false);
    useEffect(() => {
        if (!hydratedRef.current && initialScope) {
            hydratedRef.current = true;
            setAlertScopeState(initialScope as "global" | "client");
        }
    }, [initialScope]);

    const configKey =
        alertScope === "global" ? "alerts" : `client_${clientUuid}`;
    const scopeLabel =
        alertScope === "global" ? "Global" : `Client: ${clientName}`;

    const setAlertScope = useCallback(
        (scope: "global" | "client") => {
            setAlertScopeState(scope);
            api.PATCH("/v1/clients/{clientUuid}/alert-scope", {
                params: { path: { clientUuid } },
                body: { alert_scope: scope },
            }).then(() => {
                queryClient.invalidateQueries({
                    queryKey: ["clients", clientUuid],
                });
            });
        },
        [clientUuid, queryClient],
    );

    return { alertScope, setAlertScope, configKey, scopeLabel };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientDetail() {
    const navigate = useNavigate();
    const { uuid: clientUuid } = useParams<{ uuid: string }>();
    const { setTrail } = useBreadcrumb();
    const queryClient = useQueryClient();

    const [secopSearch, setSecopSearch] = useState("");

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
        parseInt(settings?.secop_limit_per_client ?? "2", 10) || 2,
    );
    const clientAlertTab = useClientAlertTab(
        clientUuid ?? "",
        client?.name ?? "",
        (client as Record<string, unknown>)?.alert_scope as string | undefined,
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
    const [selectedSecopToAdd, setSelectedSecopToAdd] = useState<string | null>(
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
    const [selectedServerForCost, setSelectedServerForCost] = useState<any | null>(null);
    const [deductAmount, setDeductAmount] = useState("");
    const [submittingPayment, setSubmittingPayment] = useState(false);

    const { data: costLogs = [], isLoading: isLoadingCostLogs } = useQuery({
        queryKey: ["server-cost-logs", selectedServerForCost?.uuid],
        queryFn: async () => {
            if (!clientUuid || !selectedServerForCost?.uuid) return [];
            const { data, error } = await api.GET(
                "/v1/clients/{clientUuid}/servers/{serverUuid}/cost-logs" as any,
                {
                    params: {
                        path: {
                            clientUuid,
                            serverUuid: selectedServerForCost.uuid,
                        },
                    },
                },
            );
            if (error) return [];
            return (data as any[]) ?? [];
        },
        enabled: !!clientUuid && !!selectedServerForCost?.uuid,
    });

    const handleCostAdjustment = async (amount: number) => {
        if (!clientUuid || !selectedServerForCost?.uuid) return;
        setSubmittingPayment(true);
        try {
            const { error } = await api.POST(
                "/v1/clients/{clientUuid}/servers/{serverUuid}/cost-adjustment",
                {
                    params: { path: { clientUuid, serverUuid: selectedServerForCost.uuid } },
                    body: { action: "deduction" as any, amount },
                },
            );
            if (error) throw error;
            toast.success(`Deduction applied to ${selectedServerForCost.name}.`);
            setSelectedServerForCost(null);
            setDeductAmount("");
            queryClient.invalidateQueries({ queryKey: ["clients", clientUuid, "servers"] });
            queryClient.invalidateQueries({ queryKey: ["clients", clientUuid] });
        } catch (err: any) {
            toast.error(err?.message || "Failed to apply deduction.");
        } finally {
            setSubmittingPayment(false);
        }
    };

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

    const hasChanges = useMemo(() => {
        if (!client) return false;
        const formChanged =
            form.name !== client.name ||
            form.description !== (client.description ?? "") ||
            form.location !== client.location ||
            form.email !== client.email ||
            form.contact_number !== client.contact_number;
        return formChanged || bannerFile !== null;
    }, [form, client, bannerFile]);

    // Breadcrumb
    useEffect(() => {
        if (mode === "create") {
            setTrail([
                { label: "Clients", href: "/clients" },
                { label: "Create" },
            ]);
        } else if (client) {
            setTrail([
                { label: "Clients", href: "/clients" },
                { label: client.name },
            ]);
        }
    }, [setTrail, mode, client]);

    const set = (key: keyof typeof form) => (value: string) =>
        setForm((f) => ({ ...f, [key]: value }));

    // ── Validation ─────────────────────────────────────────────────────────────
    const schema = z.object({
        name: z.string().trim().min(2, "Minimum 2 characters"),
        description: z.string().max(255, "Maximum 255 characters").optional(),
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
        const matchSearch = s.name
            .toLowerCase()
            .includes(serverSearch.toLowerCase());
        return matchSearch;
    });

    // Filter the users
    const availableSecops = allUsers
        .filter((user) => !currentSecops.some((s) => s.uuid === user.uuid))
        .filter((user) => {
            const q = secopSearch.trim().toLowerCase();

            if (!q) return true;

            return (
                `${user.first_name} ${user.last_name}`
                    .toLowerCase()
                    .includes(q) ||
                user.email.toLowerCase().includes(q) ||
                user.username.toLowerCase().includes(q)
            );
        });

    return (
        <>
            <LoadingOverlay visible={isSaving} />
            <div className="w-full flex flex-col min-h-0 bg-background text-foreground">
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
                                                set("name")(e.target.value)
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
                                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                                        {client?.name ?? "Client"}
                                    </h1>
                                )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
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
                                        onClick={() => setMode("edit")}
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
                                            size="sm"
                                            disabled={isSaving || !hasChanges}
                                            label={
                                                isSaving
                                                    ? "Saving…"
                                                    : "Save Changes"
                                            }
                                        />
                                    </>
                                )}
                                {showEdit && mode === "create" && (
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
                                            size="sm"
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

                        {/* ── Description (always in banner) ── */}
                        <div className="mt-3 max-w-xl">
                            {showEdit ? (
                                <div>
                                    <Label className="text-[11px] uppercase tracking-widest text-muted-foreground/70 mb-1">
                                        Description
                                    </Label>
                                    <textarea
                                        value={form.description}
                                        onChange={(e) =>
                                            set("description")(e.target.value)
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
                <div className="flex-1 -mt-12 relative z-20 px-6 sm:px-8 lg:px-10 pb-8">
                    <div className="max-w-3xl mx-auto relative flex flex-col gap-6">
                        <Tab>
                            <Tab.Item icon={Info} title="Details">
                                <form
                                    onSubmit={handleSubmit}
                                    className="bg-card border border-border/60 shadow-sm p-6 sm:p-8 flex flex-col gap-8"
                                >
                                    {/* Basic Information */}
                                    <section className="space-y-4">
                                        <SectionHeader
                                            title="Basic Information"
                                            description="Core details about this client account."
                                        />
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {showEdit ? (
                                                <div>
                                                    <FloatingInput
                                                        label="Location"
                                                        value={form.location}
                                                        onValueChange={set(
                                                            "location",
                                                        )}
                                                        className={cn(
                                                            errors.location &&
                                                            "border-destructive",
                                                        )}
                                                    />
                                                    {errors.location && (
                                                        <p className="text-xs text-destructive mt-1">
                                                            {errors.location}
                                                        </p>
                                                    )}
                                                </div>
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
                                                <div>
                                                    <FloatingInput
                                                        type="email"
                                                        label="Email Address"
                                                        value={form.email}
                                                        onValueChange={set(
                                                            "email",
                                                        )}
                                                        className={cn(
                                                            errors.email &&
                                                            "border-destructive",
                                                        )}
                                                    />
                                                    {errors.email && (
                                                        <p className="text-xs text-destructive mt-1">
                                                            {errors.email}
                                                        </p>
                                                    )}
                                                </div>
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
                                                <div>
                                                    <FloatingInput
                                                        label="Contact Number"
                                                        value={
                                                            form.contact_number
                                                        }
                                                        onValueChange={(
                                                            value,
                                                        ) => {
                                                            set(
                                                                "contact_number",
                                                            )(
                                                                formatPhoneNumber(
                                                                    value,
                                                                ),
                                                            );
                                                        }}
                                                        className={cn(
                                                            errors.contact_number &&
                                                            "border-destructive",
                                                        )}
                                                    />
                                                    {errors.contact_number && (
                                                        <p className="text-xs text-destructive mt-1">
                                                            {
                                                                errors.contact_number
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <Field
                                                    label="Contact Number"
                                                    icon={Phone}
                                                    required
                                                    isEdit={showEdit}
                                                >
                                                    <p className="text-base font-semibold text-foreground">
                                                        {formatPhoneNumber(
                                                            client?.contact_number ||
                                                            "",
                                                        )}
                                                    </p>
                                                </Field>
                                            )}
                                        </div>
                                    </section>
                                </form>
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

                            <Tab.Item icon={Banknote} title="Server Cost">
                                <div className="bg-card border border-border/60 shadow-sm p-6 sm:p-8 flex flex-col gap-6">
                                    {/* Summary Banner */}
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
                                        <div>
                                            <h3 className="text-lg font-semibold text-foreground">
                                                Server Costs & Deductions
                                            </h3>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                View server costs and manage deductions per server.
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-primary/10 border border-primary/20 shrink-0">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/15 text-primary shrink-0">
                                                <Coins size={20} />
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground">
                                                    Total Client Cost
                                                </span>
                                                <span className="text-lg font-bold text-foreground font-mono">
                                                    ₱{servers.reduce((acc: number, s: any) => acc + (s.accumulated_cost ?? 0), 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Server List & Breakdown */}
                                    {serversLoading ? (
                                        <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
                                            <Loader2 size={18} className="animate-spin text-primary" />
                                        </div>
                                    ) : servers.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2 border border-dashed border-border/60 rounded-xl">
                                            <Server size={28} className="opacity-30" />
                                            <p className="text-sm font-medium">No servers registered for this client.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-xl border border-border/60">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60">
                                                    <tr>
                                                        <th className="py-3 px-4">Server</th>
                                                        <th className="py-3 px-4">Status</th>
                                                        <th className="py-3 px-4">Next Billing Date</th>
                                                        <th className="py-3 px-4">Monthly Rate</th>
                                                        <th className="py-3 px-4 text-right">Cost</th>
                                                        <th className="py-3 px-4 text-center">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/60">
                                                    {servers.map((s: any) => {
                                                        const isOnline = s.status === "online";
                                                        const costVal = s.accumulated_cost ?? 0;
                                                        return (
                                                            <tr
                                                                key={s.uuid}
                                                                onClick={() => navigate(`/servers/${s.uuid}`)}
                                                                className="hover:bg-muted/30 transition-colors cursor-pointer"
                                                            >
                                                                <td className="py-3.5 px-4 font-semibold text-foreground">
                                                                    <div className="flex items-center gap-2">
                                                                        <Server size={15} className="text-primary shrink-0" />
                                                                        <span>{s.name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-3.5 px-4">
                                                                    <span className={cn(
                                                                        "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                                                        isOnline
                                                                            ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                                            : "bg-muted text-muted-foreground border-border"
                                                                    )}>
                                                                        <span className={cn("w-1.5 h-1.5 rounded-full", isOnline ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground")} />
                                                                        {isOnline ? "Online" : s.status === "pending_installation" ? "Pending" : "Offline"}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3.5 px-4 font-mono text-xs text-muted-foreground">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <Calendar size={13} className="text-muted-foreground/70" />
                                                                        <span>
                                                                            {s.billing_date
                                                                                ? new Date(s.billing_date).toLocaleDateString(undefined, {
                                                                                      month: "short",
                                                                                      day: "numeric",
                                                                                      year: "numeric",
                                                                                  })
                                                                                : "N/A"}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-3.5 px-4 font-mono text-foreground font-medium">
                                                                    ₱{(s.hourly_cost ?? 0).toFixed(2)} / mo
                                                                </td>
                                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-500">
                                                                    ₱{costVal.toFixed(2)}
                                                                </td>
                                                                <td className="py-3.5 px-4 text-center">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedServerForCost(s);
                                                                        }}
                                                                        className="gap-1.5 text-xs text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/10 cursor-pointer"
                                                                    >
                                                                        <Coins size={12} />
                                                                        Manage Deductions
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                                <tfoot className="bg-muted/30 border-t border-border/60 text-sm font-semibold">
                                                    <tr>
                                                        <td colSpan={4} className="py-3.5 px-4 text-muted-foreground uppercase tracking-wider text-xs">
                                                            Total (All Client Servers)
                                                        </td>
                                                        <td className="py-3.5 px-4 text-right font-mono text-base font-bold text-emerald-500">
                                                            ₱{servers.reduce((acc: number, s: any) => acc + (s.accumulated_cost ?? 0), 0).toFixed(2)}
                                                        </td>
                                                        <td></td>
                                                    </tr>
                                                </tfoot>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </Tab.Item>
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

                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    icon={<Filter size={14} />}
                                                    className="gap-1 cursor-pointer"
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
                                                            "flex items-center w-full px-2 py-1.5 rounded-md text-sm transition-colors cursor-pointer",
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
                                                className="cursor-pointer"
                                                variant="outline"
                                                size="sm"
                                                label="View All"
                                            />
                                        </Link>
                                        <Link
                                            to={`/servers/create?client_uuid=${client.uuid}`}
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
                            <div className="relative">
                                <Search
                                    size={16}
                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                                />

                                <input
                                    type="text"
                                    value={secopSearch}
                                    onChange={(e) =>
                                        setSecopSearch(e.target.value)
                                    }
                                    placeholder="Search SecOps..."
                                    className="w-full h-10 rounded-lg border border-border bg-background pl-10 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                />
                            </div>

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
                                    {availableSecops.map((user) => (
                                        <button
                                            key={user.uuid}
                                            onClick={() => {
                                                setSelectedSecopToAdd(
                                                    user.uuid,
                                                );
                                                addSecop.mutate(user.uuid, {
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
                                                selectedSecopToAdd === user.uuid
                                            }
                                            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors disabled:opacity-50 text-left border border-border/40 hover:border-border cursor-pointer"
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
                                            {selectedSecopToAdd === user.uuid &&
                                                addSecop.isPending && (
                                                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                                )}
                                        </button>
                                    ))}
                                    {availableSecops.length === 0 && (
                                        <p className="text-sm text-muted-foreground text-center py-4">
                                            {secopSearch
                                                ? "No matching SecOps found."
                                                : "All users are already assigned to this client."}
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

                <Dialog open={!!selectedServerForCost} onOpenChange={(open) => !open && setSelectedServerForCost(null)}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-foreground">
                                <Coins size={18} className="text-emerald-400" />
                                Server Cost & Deduction Management
                            </DialogTitle>
                        </DialogHeader>

                        <div className="flex flex-col gap-4 py-2">
                            <div className="flex flex-col gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400/90">
                                    Cost ({selectedServerForCost?.name})
                                </span>
                                <span className="text-3xl font-extrabold text-emerald-400 font-mono">
                                    ₱{(selectedServerForCost?.accumulated_cost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <div className="flex justify-between items-center text-[11px] text-muted-foreground pt-2 border-t border-emerald-500/20 mt-1 font-mono">
                                    <span>Payment Due: ₱{(selectedServerForCost?.net_cost ?? selectedServerForCost?.accumulated_cost ?? 0).toFixed(2)}</span>
                                    <span>Payments Recorded: ₱{(selectedServerForCost?.cost_offset ?? 0).toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Action: Payment Deduction */}
                            <div className="flex flex-col gap-2 p-3.5 rounded-lg border border-border/60 bg-card">
                                <p className="text-xs font-semibold text-foreground">Deduction</p>
                                <p className="text-[11px] text-muted-foreground">
                                    Enter a payment amount to deduct directly from the total accumulated server cost.
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="e.g. 500.00"
                                        value={deductAmount}
                                        onChange={(e) => setDeductAmount(e.target.value)}
                                        className="text-sm font-mono"
                                    />
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        label={submittingPayment ? "Applying…" : "Deduct"}
                                        onClick={() => {
                                            const val = parseFloat(deductAmount);
                                            if (isNaN(val) || val <= 0) {
                                                toast.error("Please enter a valid positive payment amount.");
                                                return;
                                            }
                                            handleCostAdjustment(val);
                                        }}
                                        disabled={submittingPayment || !deductAmount || parseFloat(deductAmount) <= 0}
                                        className="shrink-0"
                                    />
                                </div>
                            </div>

                            {/* Cost Activity Logs */}
                            <div className="flex flex-col gap-2 pt-2 border-t border-border/60">
                                <div className="flex items-center gap-2">
                                    <History size={14} className="text-muted-foreground" />
                                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                        Cost & Payment Activity Logs
                                    </h4>
                                </div>

                                <div className="max-h-44 overflow-y-auto flex flex-col gap-2 pr-1">
                                    {isLoadingCostLogs ? (
                                        <p className="text-xs text-muted-foreground py-3 text-center">Loading logs…</p>
                                    ) : costLogs.length === 0 ? (
                                        <p className="text-xs text-muted-foreground py-3 text-center">No cost activity logs recorded yet.</p>
                                    ) : (
                                        costLogs.map((log: any) => {
                                            const msg = log.details?.message || log.action;
                                            return (
                                                <div key={log.id} className="p-2.5 rounded-lg bg-muted/20 border border-border/40 flex flex-col gap-1">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="text-xs font-medium text-foreground">
                                                            {log.action}
                                                        </span>
                                                        {log.created_at && (
                                                            <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                                                {new Date(log.created_at).toLocaleString(undefined, {
                                                                    month: "short",
                                                                    day: "numeric",
                                                                    year: "numeric",
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                })}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        {msg}
                                                    </p>
                                                    {log.details?.before?.hourly_cost && log.details?.after?.hourly_cost && (
                                                        <div className="text-[11px] font-mono text-emerald-400/90 flex items-center gap-1.5 mt-0.5">
                                                            <span>Before: ₱{log.details.before.hourly_cost}/mo</span>
                                                            <span>→</span>
                                                            <span>After: ₱{log.details.after.hourly_cost}/mo</span>
                                                        </div>
                                                    )}
                                                    {log.user && (
                                                        <p className="text-[10px] text-muted-foreground/70">
                                                            By: {log.user}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <DialogClose asChild>
                                <Button variant="outline" label="Close" onClick={() => setSelectedServerForCost(null)} />
                            </DialogClose>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </>
    );
}
