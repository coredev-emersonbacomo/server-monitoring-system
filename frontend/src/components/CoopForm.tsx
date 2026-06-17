import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CoopFormProps {
    title: string;
    initialBannerUrl?: string;
    onSubmit: (formData: FormData) => Promise<void>;
    isPending: boolean;
}

export function CoopForm({ title, initialBannerUrl, onSubmit, isPending }: CoopFormProps) {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [location, setLocation] = useState("");
    const [email, setEmail] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [bannerFile, setBannerFile] = useState<File | null>(null);
    const [bannerPreview, setBannerPreview] = useState<string | null>(initialBannerUrl ?? null);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});

        const fd = new FormData();
        fd.append("name", name);
        fd.append("description", description);
        fd.append("location", location);
        fd.append("email", email);
        fd.append("contact_number", contactNumber);
        if (bannerFile) {
            fd.append("banner_image", bannerFile);
        }

        try {
            await onSubmit(fd);
        } catch (err: unknown) {
            if (err && typeof err === "object" && "errors" in err) {
                setErrors((err as { errors: Record<string, string[]> }).errors);
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
            setBannerPreview(initialBannerUrl ?? null);
        }
    };

    const hasBanner = bannerPreview && bannerPreview !== "";

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
            <div
                className="relative"
                style={
                    hasBanner
                        ? {
                              background: `linear-gradient(to bottom, oklch(0.3 0.1 260 / 0.6), oklch(0.2 0.05 260 / 0.3))`,
                          }
                        : undefined
                }
            >
                <div className="absolute inset-0 overflow-hidden">
                    <div
                        className="w-full h-full bg-linear-to-br from-primary/5 via-transparent to-primary/10"
                        style={
                            hasBanner
                                ? {
                                      backgroundImage: `url(${bannerPreview})`,
                                      backgroundSize: "cover",
                                      backgroundPosition: "center",
                                  }
                                : undefined
                        }
                    />
                    <div className="absolute inset-0 bg-linear-to-t from-background via-background/60 to-transparent" />
                </div>

                <div className="relative z-10 px-6 sm:px-8 lg:px-10 pt-6 pb-20">
                    <button
                        onClick={() => navigate(-1)}
                        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </button>
                    <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
                </div>
            </div>

            <div className="flex-1 -mt-12 relative z-20 px-6 sm:px-8 lg:px-10 pb-8">
                <form
                    onSubmit={handleSubmit}
                    className="max-w-2xl bg-card border border-border/60 rounded-xl p-6 shadow-sm space-y-5"
                >
                    <div>
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                        {errors.name?.map((e) => (
                            <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                        ))}
                    </div>

                    <div>
                        <Label htmlFor="description">Description</Label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        />
                        {errors.description?.map((e) => (
                            <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                        ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="location">Location</Label>
                            <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} required />
                            {errors.location?.map((e) => (
                                <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                            ))}
                        </div>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                            {errors.email?.map((e) => (
                                <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="contact_number">Contact Number</Label>
                        <Input id="contact_number" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} required />
                        {errors.contact_number?.map((e) => (
                            <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                        ))}
                    </div>

                    <div>
                        <Label htmlFor="banner_image">Banner Image</Label>
                        <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 px-4 py-2 rounded-md border border-input bg-transparent text-sm font-medium cursor-pointer hover:bg-muted/50 transition-colors">
                                <Upload className="w-4 h-4" />
                                {bannerFile ? "Change Image" : "Upload Image"}
                                <input
                                    id="banner_image"
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
                                        setBannerPreview(initialBannerUrl ?? null);
                                    }}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                        {errors.banner_image?.map((e) => (
                            <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                        ))}
                    </div>

                    <div className="flex items-center justify-end gap-3 pt-2 border-t border-border/40">
                        <Button variant="outline" label="Cancel" onClick={() => navigate(-1)} />
                        <Button label={isPending ? "Saving..." : "Save"} disabled={isPending} />
                    </div>
                </form>
            </div>
        </div>
    );
}
