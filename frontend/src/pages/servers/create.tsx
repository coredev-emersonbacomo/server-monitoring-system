import { type ClipboardEvent, type KeyboardEvent, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import {
    AlertTriangle,
    ArrowRight,
    ShieldCheck,
    Server,
} from "lucide-react";
import { toast } from "sonner";
import { FloatingInput } from "@/components/ui/floatingInput";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import IndexHeader from "@/components/IndexHeader";
import api from "@/api/api";
import { Form, createFormStore, useForm } from "@/components/ui/form";

const blockedMonthlyCostKeys = new Set(["e", "E", "-"]);

function blockInvalidMonthlyCostKey(e: KeyboardEvent<HTMLInputElement>) {
    if (blockedMonthlyCostKeys.has(e.key)) e.preventDefault();
}

function blockInvalidMonthlyCostPaste(e: ClipboardEvent<HTMLInputElement>) {
    if (/[eE-]/.test(e.clipboardData.getData("text"))) e.preventDefault();
}

function setMonthlyCostValue(setValue: (value: string) => void, value: string) {
    if (/[eE-]/.test(value)) return;
    const numericValue = Number(value);
    setValue(numericValue < 0 ? "0" : value);
}
const schema = z.object({
    name: z.string().min(1, "Server name is required"),
    description: z.string().max(255, "Maximum 255 characters").optional().default(""),
    monthly_cost: z.union([z.string(), z.number()]).transform((val) => {
        if (val === "" || val === undefined || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : Math.max(0, num);
    }),
});

export default function CreateServer() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const clientUuid = searchParams.get("client_uuid") || null;

    const store = useMemo(
        () => createFormStore({
            schema,
            originalData: { name: "", description: "", monthly_cost: 0 },
            initialMode: "create",
        }),
        [],
    );

    const trail = [
        { label: "Clients", href: "/clients" },
        { label: "Add server" },
    ];

    if (!clientUuid) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 p-8">
                <AlertTriangle size={32} className="opacity-40" />
                <p className="text-sm">No client selected.</p>
                <button
                    onClick={() => navigate("/clients")}
                    className="text-sm text-primary hover:underline cursor-pointer"
                >
                    Back to clients
                </button>
            </div>
        );
    }

    return (
        <div className="w-full flex flex-col min-h-0 bg-background text-foreground">
            <IndexHeader icon={Server} trail={trail} />
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

                    <Form.Root store={store} className="bg-card border border-border/60 rounded-xl shadow-sm divide-y divide-border/60">
                        <Form.SubmitHandler
                            handler={async (data: Record<string, unknown>) => {
                                if (!clientUuid) {
                                    toast.error("No client selected.");
                                    return;
                                }
                                const { data: result, error: apiError } = await api.POST(
                                    "/v1/clients/{clientUuid}/servers",
                                    {
                                        params: { path: { clientUuid } },
                                        body: {
                                            name: String(data.name).trim(),
                                            description: (String(data.description ?? "").trim()) || "",
                                            monthly_cost: Math.max(0, Number(data.monthly_cost) || 0),
                                        },
                                    },
                                );
                                if (apiError) {
                                    const msg = (apiError as { message?: string }).message;
                                    toast.error(msg ?? "Failed to create server.");
                                } else {
                                    toast.success("Server created successfully!");
                                    navigate(`/servers/${result.uuid}?client=${clientUuid}`);
                                }
                            }}
                        />

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

                            <CreateServerFields store={store} />
                        </div>

                        <div className="px-6 py-4 flex items-center justify-between bg-muted/30 rounded-b-xl">
                            <button
                                type="button"
                                onClick={() => navigate(-1)}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <Form.Button
                                type="submit"
                                icon={<ArrowRight size={14} />}
                            >
                                Create Server
                            </Form.Button>
                        </div>
                    </Form.Root>
                </div>
            </div>
        </div>
    );
}

function CreateServerFields({ store }: { store: ReturnType<typeof createFormStore> }) {
    const form = useForm(store, (s) => s.form as z.infer<typeof schema>);
    const errors = useForm(store, (s) => s.errors);

    return (
        <>
            <div>
                <FloatingInput
                    label="Server name"
                    value={form.name}
                    onValueChange={store.set("name")}
                    className={cn(errors.name && "border-destructive")}
                />
                {errors.name && (
                    <p className="text-[11px] text-destructive mt-1.5">
                        {errors.name}
                    </p>
                )}
            </div>

            <div>
                <FloatingInput
                    label="Monthly Cost (₱ / mo)"
                    inputBg="bg-card"
                    type="number"
                    step="0.01"
                    min="0"
                    value={String(form.monthly_cost ?? "")}
                    onKeyDown={blockInvalidMonthlyCostKey}
                    onPaste={blockInvalidMonthlyCostPaste}
                    onValueChange={(value) =>
                        setMonthlyCostValue(store.set("monthly_cost"), value)
                    }
                />
            </div>

            <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-medium text-foreground/80">
                    Description
                </Label>
                <textarea
                    placeholder="e.g. Primary production web server"
                    value={form.description}
                    onChange={(e) => store.set("description")(e.target.value)}
                    rows={3}
                    maxLength={255}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                />
                <p className="text-[11px] text-muted-foreground">
                    Optional notes about this server's role or purpose.
                </p>
            </div>
        </>
    );
}
