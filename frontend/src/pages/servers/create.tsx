import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FloatingInput } from "@/components/ui/floatingInput";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import api from "@/api/api";
function Field({
    label,
    required,
    error,
    hint,
    children,
}: {
    label?: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            {label && (
                <Label className="text-xs font-medium text-foreground/80">
                    {label}
                    {required && (
                        <span className="text-destructive ml-0.5">*</span>
                    )}
                </Label>
            )}
            {children}
            {hint && !error && (
                <p className="text-[11px] text-muted-foreground">{hint}</p>
            )}
            {error && <p className="text-[11px] text-destructive">{error}</p>}
        </div>
    );
}

export default function CreateServer() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const clientUuid = searchParams.get("client_uuid") || null;
    const { setTrail } = useBreadcrumb();

    const [serverName, setServerName] = useState("");
    const [serverDescription, setServerDescription] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setTrail([
            { label: "Clients", href: "/clients" },
            { label: "Add server" },
        ]);
    }, [setTrail, clientUuid]);

    const handleSubmit = async () => {
        if (!serverName.trim()) {
            setError("Server name is required");
            return;
        }

        if (!clientUuid) {
            toast.error("No client selected.");
            return;
        }

        setLoading(true);
        setError("");

        const { data, error: apiError } = await api.POST(
            "/v1/clients/{clientUuid}/servers",
            {
                params: { path: { clientUuid } },
                body: {
                    name: serverName.trim(),
                    description: serverDescription.trim() || "",
                },
            },
        );

        setLoading(false);

        if (apiError) {
            setError(
                (apiError as { message?: string }).message ??
                    "Failed to create server. Please try again.",
            );
            toast.error("Failed to create server.");
        } else {
            toast.success("Server created successfully!");
            navigate(`/servers/${data.uuid}?client=${clientUuid}`);
        }
    };

    if (!clientUuid) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 p-8">
                <AlertTriangle size={32} className="opacity-40" />
                <p className="text-sm">No client selected.</p>
                <Button
                    variant="outline"
                    size="sm"
                    icon={<ArrowLeft size={14} />}
                    label="Back to clients"
                    onClick={() => navigate("/clients")}
                />
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col min-h-0 bg-background text-foreground">
            <div className="flex-1">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">
                    <div>
                        <h1 className="text-xl font-semibold tracking-tight">
                            Add a Server
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Define your server metadata. Once created, you will
                            be provided with an installation command to deploy
                            the agent locally.
                        </p>
                    </div>

                    <div className="bg-card border border-border/60 rounded-xl shadow-sm divide-y divide-border/60">
                        <div className="p-6 flex flex-col gap-5">
                            <div className="flex items-start justify-between">
                                <div>
                                    <p className="text-sm font-medium">
                                        Server Details
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Basic identifiers for server
                                        organization.
                                    </p>
                                </div>
                                <span className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5 shrink-0">
                                    <ShieldCheck size={11} />
                                    Agent-based
                                </span>
                            </div>

                            <div>
                                <FloatingInput
                                    label="Server name"
                                    labelBg="bg-card"
                                    value={serverName}
                                    onChange={(e) => {
                                        setServerName(e.target.value);
                                        setError("");
                                    }}
                                    className={cn(
                                        error && "border-destructive",
                                    )}
                                />
                                {error && (
                                    <p className="text-[11px] text-destructive mt-1.5">
                                        {error}
                                    </p>
                                )}
                            </div>

                            <Field
                                label="Description"
                                hint="Optional notes about this server's role or purpose."
                            >
                                <textarea
                                    placeholder="e.g. Primary production web server"
                                    value={serverDescription}
                                    onChange={(e) =>
                                        setServerDescription(e.target.value)
                                    }
                                    rows={3}
                                    maxLength={255}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                                />
                            </Field>
                        </div>

                        <div className="px-6 py-4 flex items-center justify-between bg-muted/30 rounded-b-xl">
                            <button
                                onClick={() => navigate(-1)}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                            >
                                Cancel
                            </button>
                            <Button
                                icon={<ArrowRight size={14} />}
                                label={
                                    loading ? "Creating..." : "Create Server"
                                }
                                onClick={handleSubmit}
                                disabled={loading}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
