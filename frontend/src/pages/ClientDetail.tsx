import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Pencil, Loader2, Upload } from "lucide-react";
import { useClient, useCreateClient, useUpdateClient, useDeleteClient } from "@/hooks/useClients";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { Button } from "@/components/ui/button";

function DetailField({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
            {children}
        </div>
    );
}

function StackField({
    label,
    readValue,
    editValue,
}: {
    label: string;
    readValue: React.ReactNode;
    editValue: React.ReactNode;
}) {
    return (
        <DetailField label={label}>
            <div className="grid grid-cols-[1fr] grid-rows-[1fr]">
                <div className="col-start-1 row-start-1 [.nc-edit_&]:invisible [.nc-create_&]:invisible">
                    {readValue}
                </div>
                <div className="col-start-1 row-start-1 invisible [.nc-edit_&]:visible [.nc-create_&]:visible">
                    {editValue}
                </div>
            </div>
        </DetailField>
    );
}

export default function ClientDetail() {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const { setTrail } = useBreadcrumb();
    const isCreate = !id;

    const clientId = Number(id);
    const { data: client, isLoading, error } = useClient(clientId);
    const createClient = useCreateClient();
    const updateClient = useUpdateClient(clientId);
    const deleteClient = useDeleteClient();

    const formKey = isCreate ? "create" : `client-${clientId}`;
    const [isEditing, setIsEditing] = useState(isCreate);
    const [name, setName] = useState(() => isCreate ? "" : client?.name ?? "");
    const [description, setDescription] = useState(() => isCreate ? "" : client?.description ?? "");
    const [location, setLocation] = useState(() => isCreate ? "" : client?.location ?? "");
    const [email, setEmail] = useState(() => isCreate ? "" : client?.email ?? "");
    const [contactNumber, setContactNumber] = useState(() => isCreate ? "" : client?.contact_number ?? "");
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(() => isCreate ? null : client?.banner_image_url ?? null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
    const [deleting, setDeleting] = useState(false);

    useEffect(() => {
        if (isCreate) {
            setTrail([
                { label: "Clients", href: "/clients" },
                { label: "Create", href: "/clients/create" },
            ]);
        } else if (client) {
            setTrail([
                { label: "Clients", href: "/clients" },
                { label: client.name, href: `/clients/${client.id}` },
            ]);
        }
    }, [setTrail, isCreate, client]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFieldErrors({});

        const fd = new FormData();
        fd.append("name", name);
        fd.append("description", description);
        fd.append("location", location);
        fd.append("email", email);
        fd.append("contact_number", contactNumber);
        if (bannerFile) fd.append("banner_image", bannerFile);

        try {
            if (isCreate) {
                await createClient.mutateAsync(fd);
                navigate("/clients");
            } else {
                await updateClient.mutateAsync(fd);
                setIsEditing(false);
            }
        } catch (err: unknown) {
            if (err && typeof err === "object" && "errors" in err) {
                setFieldErrors((err as { errors: Record<string, string[]> }).errors);
            }
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

    const handleDelete = async () => {
        if (!client) return;
        await deleteClient.mutateAsync(client.id);
        navigate("/clients");
    };

    if (!isCreate && isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!isCreate && (error || !client)) {
        return (
            <div className="flex-1 flex items-center justify-center text-sm text-destructive">
                Failed to load client
            </div>
        );
    }

    const showEdit = isEditing || isCreate;
    const hasBanner = !!bannerPreview;
    const isPending = createClient.isPending || updateClient.isPending;

    return (
        <div key={formKey} className={`flex-1 flex flex-col min-h-0 bg-background text-foreground ${showEdit ? "nc-edit" : ""} ${isCreate ? "nc-create" : ""}`}>
            {/* Banner */}
            <div
                className="relative"
                style={hasBanner ? { background: "linear-gradient(to bottom, oklch(0.3 0.1 260 / 0.6), oklch(0.2 0.05 260 / 0.3))" } : undefined}
            >
                <div className="absolute inset-0 overflow-hidden">
                    <div
                        className="w-full h-full"
                        style={hasBanner ? { backgroundImage: `url(${bannerPreview})`, backgroundSize: "cover", backgroundPosition: "center" } : { background: "linear-gradient(to bottom right, oklch(0.15 0.05 260 / 0.5), transparent, oklch(0.12 0.03 260 / 0.3))" }}
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />
                </div>

                <div className="relative z-10 px-6 sm:px-8 lg:px-10 pt-6 pb-20">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => navigate("/clients")}
                            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Clients
                        </button>
                        <div className="flex items-center gap-2">
                            {!isCreate && !showEdit && (
                                <Button variant="outline" icon={<Pencil className="w-4 h-4" />} label="Edit" onClick={() => setIsEditing(true)} />
                            )}
                            {showEdit && (
                                <>
                                    {!isCreate && (
                                        <Button variant="outline" label="Cancel" onClick={() => { setIsEditing(false); if (client) { setName(client.name); setDescription(client.description); setLocation(client.location); setEmail(client.email); setContactNumber(client.contact_number); setBannerPreview(client.banner_image_url ?? null); setBannerFile(null); } }} />
                                    )}
                                    {isCreate && (
                                        <Button variant="outline" label="Cancel" onClick={() => navigate("/clients")} />
                                    )}
                                </>
                            )}
                            {!isCreate && !showEdit && (
                                <button
                                    onClick={() => setDeleting(true)}
                                    className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-[1fr] grid-rows-[1fr]">
                        <h1 className="col-start-1 row-start-1 text-3xl font-bold tracking-tight [.nc-edit_&]:invisible [.nc-create_&]:invisible">
                            {client?.name ?? "Client"}
                        </h1>
                        <div className="col-start-1 row-start-1 invisible [.nc-edit_&]:visible [.nc-create_&]:visible">
                            <input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Client name"
                                className="w-full text-3xl font-bold tracking-tight bg-transparent border-b-2 border-primary/50 outline-none pb-1 placeholder:text-muted-foreground/40"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 -mt-12 relative z-20 px-6 sm:px-8 lg:px-10 pb-8">
                <form onSubmit={handleSubmit} className="max-w-2xl bg-card border border-border/60 rounded-xl p-6 shadow-sm space-y-6">
                    {/* Name */}
                    <StackField
                        label="Name"
                        readValue={<p className="text-sm text-foreground">{client?.name}</p>}
                        editValue={
                            <div>
                                <input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                                {fieldErrors.name?.map((e) => (<p key={e} className="text-xs text-destructive mt-1">{e}</p>))}
                            </div>
                        }
                    />

                    {/* Description */}
                    <StackField
                        label="Description"
                        readValue={<p className="text-sm text-muted-foreground">{client?.description || "—"}</p>}
                        editValue={
                            <div>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    rows={3}
                                    className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                                />
                                {fieldErrors.description?.map((e) => (<p key={e} className="text-xs text-destructive mt-1">{e}</p>))}
                            </div>
                        }
                    />

                    {/* Location + Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <StackField
                            label="Location"
                            readValue={<p className="text-sm text-foreground">{client?.location}</p>}
                            editValue={
                                <div>
                                    <input
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                    {fieldErrors.location?.map((e) => (<p key={e} className="text-xs text-destructive mt-1">{e}</p>))}
                                </div>
                            }
                        />
                        <StackField
                            label="Email"
                            readValue={<p className="text-sm text-foreground">{client?.email}</p>}
                            editValue={
                                <div>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    />
                                    {fieldErrors.email?.map((e) => (<p key={e} className="text-xs text-destructive mt-1">{e}</p>))}
                                </div>
                            }
                        />
                    </div>

                    {/* Contact Number */}
                    <StackField
                        label="Contact Number"
                        readValue={<p className="text-sm text-foreground">{client?.contact_number}</p>}
                        editValue={
                            <div>
                                <input
                                    value={contactNumber}
                                    onChange={(e) => setContactNumber(e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                />
                                {fieldErrors.contact_number?.map((e) => (<p key={e} className="text-xs text-destructive mt-1">{e}</p>))}
                            </div>
                        }
                    />

                    {/* Banner Image */}
                    <StackField
                        label="Banner Image"
                        readValue={
                            hasBanner ? (
                                <img src={bannerPreview!} alt="Banner" className="w-full max-h-40 object-cover rounded-lg border border-border/60" />
                            ) : (
                                <p className="text-sm text-muted-foreground">No banner image</p>
                            )
                        }
                        editValue={
                            <div>
                                {hasBanner && (
                                    <img src={bannerPreview!} alt="Banner" className="w-full max-h-40 object-cover rounded-lg border border-border/60 mb-3" />
                                )}
                                <div className="flex items-center gap-3">
                                    <label className="flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-transparent text-sm font-medium cursor-pointer hover:bg-muted/50 transition-colors">
                                        <Upload className="w-4 h-4" />
                                        {bannerFile ? "Change Image" : "Upload Image"}
                                        <input
                                            type="file"
                                            accept="image/jpeg,image/png,image/jpg,image/gif,image/webp"
                                            onChange={handleBannerChange}
                                            className="hidden"
                                        />
                                    </label>
                                    {bannerFile && (
                                        <button
                                            type="button"
                                            onClick={() => { setBannerFile(null); setBannerPreview(client?.banner_image_url ?? null); }}
                                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                        }
                    />

                    {/* Metadata */}
                    {!isCreate && client && (
                        <div className="pt-4 border-t border-border/40">
                            <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                                <div>
                                    <span className="font-medium">Servers:</span> {client.servers_count}
                                </div>
                                <div>
                                    <span className="font-medium">Created:</span> {new Date(client.created_at).toLocaleDateString()}
                                </div>
                                <div>
                                    <span className="font-medium">Updated:</span> {new Date(client.updated_at).toLocaleDateString()}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    {showEdit && (
                        <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/40">
                            <Button
                                type="submit"
                                label={isPending ? "Saving..." : isCreate ? "Create Client" : "Save Changes"}
                                disabled={isPending}
                            />
                        </div>
                    )}
                </form>
            </div>

            {/* Delete confirmation */}
            {deleting && client && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-card border border-border/60 rounded-xl p-6 max-w-sm w-full mx-4 shadow-lg">
                        <h2 className="text-base font-semibold mb-1">Delete Client</h2>
                        <p className="text-sm text-muted-foreground mb-5">
                            Are you sure you want to delete <strong className="text-foreground">{client.name}</strong>? This cannot be undone.
                        </p>
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" label="Cancel" onClick={() => setDeleting(false)} />
                            <Button
                                variant="danger"
                                label={deleteClient.isPending ? "Deleting..." : "Delete"}
                                disabled={deleteClient.isPending}
                                onClick={handleDelete}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
