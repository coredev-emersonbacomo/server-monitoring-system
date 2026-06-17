import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CoopFormValues {
    name: string;
    description: string;
    location: string;
    email: string;
    contact_number: string;
    banner_picture: string;
}

interface CoopFormProps {
    title: string;
    initial?: CoopFormValues;
    onSubmit: (data: Record<string, unknown>) => Promise<void>;
    isPending: boolean;
}

const emptyForm: CoopFormValues = {
    name: "",
    description: "",
    location: "",
    email: "",
    contact_number: "",
    banner_picture: "",
};

export function CoopForm({ title, initial, onSubmit, isPending }: CoopFormProps) {
    const navigate = useNavigate();
    const [form, setForm] = useState<CoopFormValues>(initial ?? emptyForm);
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        try {
            await onSubmit(form);
        } catch (err: unknown) {
            if (err && typeof err === "object" && "errors" in err) {
                setErrors((err as { errors: Record<string, string[]> }).errors);
            }
        }
    };

    const set = (field: keyof CoopFormValues) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setForm((prev) => ({ ...prev, [field]: e.target.value }));

    const hasBanner = form.banner_picture?.trim();

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
                                      backgroundImage: `url(${form.banner_picture})`,
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
                        <Input id="name" value={form.name} onChange={set("name")} required />
                        {errors.name?.map((e) => (
                            <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                        ))}
                    </div>

                    <div>
                        <Label htmlFor="description">Description</Label>
                        <textarea
                            id="description"
                            value={form.description}
                            onChange={set("description")}
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
                            <Input id="location" value={form.location} onChange={set("location")} required />
                            {errors.location?.map((e) => (
                                <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                            ))}
                        </div>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input id="email" type="email" value={form.email} onChange={set("email")} required />
                            {errors.email?.map((e) => (
                                <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                            ))}
                        </div>
                    </div>

                    <div>
                        <Label htmlFor="contact_number">Contact Number</Label>
                        <Input id="contact_number" value={form.contact_number} onChange={set("contact_number")} required />
                        {errors.contact_number?.map((e) => (
                            <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                        ))}
                    </div>

                    <div>
                        <Label htmlFor="banner_picture">Banner Picture URL</Label>
                        <Input id="banner_picture" value={form.banner_picture} onChange={set("banner_picture")} placeholder="https://example.com/banner.jpg" />
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
