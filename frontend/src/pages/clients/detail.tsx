import { useState, useEffect, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
    Pencil,
    Upload,
    AlertTriangle,
    Trash2,
    RefreshCw,
    Info,
    Shield,
    Bell,
    Landmark,
} from "lucide-react";
import { createFormStore, useForm } from "@/components/ui/form";
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

import { useSettings } from "@/hooks/useSettings";
import type { UserData } from "@/types/models";
import { Tab } from "@/components/ui/tab";
import IndexHeader from "@/components/IndexHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LoadingOverlay } from "@/components/LoadingOverlay";
import { uploadFile } from "@/lib/uploadToast";
import FormSkeleton from "./components/FormSkeleton";
import { DeleteClientDialog } from "./components/DeleteClientDialog";
import { AddSecopDialog } from "./components/AddSecopDialog";
import { VerifyRequiredModal } from "@/components/VerifyRequiredModal";
import { clientSchema } from "./constants/schema";
import { useClientAlertTab } from "./hooks/useClientAlertTab";
import { useFormattedNumberInput } from "@/hooks/useFormattedNumberInput";
import { ClientDetailsTab } from "./tabs/ClientDetailsTab";
import { ClientDetailsSecOpsTab } from "./tabs/ClientDetailsSecOpsTab";
import { ClientDetailsAlertsTab } from "./tabs/ClientDetailsAlertsTab";
import { ClientDetailsServersTab } from "./tabs/ClientDetailsServersTab";
// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ClientDetail() {
    const navigate = useNavigate();
    const { uuid: clientUuid } = useParams<{ uuid: string }>();

    // ── Data fetching ──────────────────────────────────────────────────────────
    const { data: client, isLoading, isError } = useClient(clientUuid!);

    useDocumentTitle(client?.name ?? undefined);

    const { data: servers = [], isLoading: serversLoading } = useClientServers(
        clientUuid!,
    );
    const { data: currentSecops = [], isLoading: secopLoading } =
        useClientSecops(clientUuid!);
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

    const { inputRef, formatValue, handleChange, handleKeyDown, handlePaste } =
        useFormattedNumberInput();

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
    const [verifyReqUser, setVerifyReqUser] = useState<UserData | null>(null);
    const defaultBanner = import.meta.env.VITE_DEFAULT_CLIENT_BANNER as string;
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(
        clientUuid ? null : defaultBanner,
    );

    const isSaving =
        createClient.isPending || updateClient.isPending || isSubmitting;

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
                                <ClientDetailsTab
                                    store={store}
                                    isCreate={isCreate}
                                    client={client}
                                    onSubmit={handleSubmit}
                                    inputRef={inputRef}
                                    formatValue={formatValue}
                                    handleChange={handleChange}
                                    handleKeyDown={handleKeyDown}
                                    handlePaste={handlePaste}
                                />
                            </Tab.Item>
                            {mode === "view" && client && (
                                <Tab.Item icon={Shield} title="Sec Ops">
                                    <ClientDetailsSecOpsTab
                                        client={client}
                                        currentSecops={currentSecops}
                                        secopLoading={secopLoading}
                                        secopLimit={secopLimit}
                                        onAddClick={() =>
                                            setShowSecopDialog(true)
                                        }
                                        removeSecop={removeSecop}
                                    />
                                </Tab.Item>
                            )}
                            {mode === "view" && client && (
                                <Tab.Item icon={Bell} title="Alerts">
                                    <ClientDetailsAlertsTab
                                        client={client}
                                        clientAlertTab={clientAlertTab}
                                    />
                                </Tab.Item>
                            )}
                        </Tab>
                        {mode === "view" && client && (
                            <ClientDetailsServersTab
                                client={client}
                                servers={servers}
                                serversLoading={serversLoading}
                            />
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
                    excludedUuids={currentSecops.map((s) => s.uuid)}
                    isAdding={addSecop.isPending}
                    onAddSecop={(user) => {
                        if (!user.email_verified_at) {
                            setShowSecopDialog(false);
                            setVerifyReqUser(user);
                            return;
                        }
                        addSecop.mutate(user.uuid, {
                            onSuccess: () => {
                                toast.success(
                                    `${user.first_name} ${user.last_name} added to ${client?.name}.`,
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

                <VerifyRequiredModal
                    open={!!verifyReqUser}
                    onOpenChange={(open) => {
                        if (!open) setVerifyReqUser(null);
                    }}
                    userName={
                        verifyReqUser
                            ? `${verifyReqUser.first_name} ${verifyReqUser.last_name}`
                            : undefined
                    }
                    userUuid={verifyReqUser?.uuid}
                />
            </div>
        </>
    );
}
