import { type ClipboardEvent, type KeyboardEvent, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
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
import { useClient, useClientServers } from "@/hooks/useClients";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const blockedSubscriptionFeeKeys = new Set(["e", "E", "-"]);

function blockInvalidSubscriptionFeeKey(e: KeyboardEvent<HTMLInputElement>) {
    if (blockedSubscriptionFeeKeys.has(e.key)) e.preventDefault();
}

function blockInvalidSubscriptionFeePaste(e: ClipboardEvent<HTMLInputElement>) {
    if (/[eE-]/.test(e.clipboardData.getData("text"))) e.preventDefault();
}

function setSubscriptionFeeValue(setValue: (value: string) => void, value: string) {
    if (/[eE-]/.test(value)) return;
    const numericValue = Number(value);
    setValue(numericValue < 0 ? "0" : value);
}

const schema = z.object({
    name: z.string().min(1, "Server name is required"),
    description: z.string().max(255, "Maximum 255 characters").optional().default(""),
    subscription_fee: z.union([z.string(), z.number()]).transform((val) => {
        if (val === "" || val === undefined || val === null) return 0;
        const num = Number(val);
        return isNaN(num) ? 0 : Math.max(0, num);
    }),
});

export default function CreateServer() {
    useDocumentTitle("Create Server");
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const clientUuid = searchParams.get("client_uuid") || null;

    const { data: client, isLoading: clientLoading } = useClient(clientUuid ?? "");
    const { data: clientServers = [] } = useClientServers(clientUuid ?? "");

    const [budgetWarning, setBudgetWarning] = useState<{
        newTotal: number;
        budget: number;
        pendingPayload: { name: string; description: string; subscription_fee: number };
    } | null>(null);

    const store = useMemo(
        () => createFormStore({
            schema,
            originalData: { name: "", description: "", subscription_fee: 0 },
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

    const executeCreateServer = async (payload: { name: string; description: string; subscription_fee: number }) => {
        const { data: result, error: apiError } = await api.POST(
            "/v1/clients/{clientUuid}/servers",
            {
                params: { path: { clientUuid } },
                body: payload,
            },
        );
        if (apiError) {
            const msg = (apiError as { message?: string }).message;
            toast.error(msg ?? "Failed to create server.");
        } else {
            toast.success("Server created successfully!");
            navigate(`/servers/${result.uuid}?client=${clientUuid}`);
        }
    };

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
                                const payload = {
                                    name: String(data.name).trim(),
                                    description: (String(data.description ?? "").trim()) || "",
                                    subscription_fee: Math.max(0, Number(data.subscription_fee) || 0),
                                };

                                const clientBudget = Number(client?.budget) || 0;
                                const currentTotalFee = (clientServers ?? []).reduce(
                                    (acc, s) => acc + (Number(s.subscription_fee) || 0),
                                    0,
                                );
                                const newTotalFee = currentTotalFee + payload.subscription_fee;

                                if (clientBudget > 0 && newTotalFee > clientBudget) {
                                    setBudgetWarning({
                                        newTotal: newTotalFee,
                                        budget: clientBudget,
                                        pendingPayload: payload,
                                    });
                                    return;
                                }

                                await executeCreateServer(payload);
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

                            <CreateServerFields store={store as any} clientName={client?.name} clientLoading={clientLoading} />
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

            {/* Budget Exceeded Warning Dialog */}
            <Dialog open={!!budgetWarning} onOpenChange={(open) => !open && setBudgetWarning(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-500">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            Budget Exceeded Warning
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-3 text-sm text-foreground/90 flex flex-col gap-3">
                        <p>
                            Adding this server will push the client's total monthly subscription fees over its allocated budget limit.
                        </p>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Monthly Budget Limit:</span>
                                <span className="font-semibold text-foreground">
                                    ₱{(budgetWarning?.budget ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">New Total Subscription Fees:</span>
                                <span className="font-semibold text-amber-500">
                                    ₱{(budgetWarning?.newTotal ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-amber-500/20 pt-1.5">
                                <span className="text-muted-foreground">Amount Exceeded:</span>
                                <span className="font-bold text-destructive">
                                    ₱{((budgetWarning?.newTotal ?? 0) - (budgetWarning?.budget ?? 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Do you still want to proceed and create this server?
                        </p>
                    </div>

                    <DialogFooter className="flex gap-2 justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setBudgetWarning(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            className="bg-amber-600 hover:bg-amber-700 text-white"
                            onClick={async () => {
                                if (budgetWarning?.pendingPayload) {
                                    const payload = budgetWarning.pendingPayload;
                                    setBudgetWarning(null);
                                    await executeCreateServer(payload);
                                }
                            }}
                        >
                            Proceed Anyway
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function CreateServerFields({
    store,
    clientName,
    clientLoading,
}: {
    store: ReturnType<typeof createFormStore>;
    clientName?: string;
    clientLoading?: boolean;
}) {
    const form = useForm(store, (s) => s.form as z.infer<typeof schema>);
    const errors = useForm(store, (s) => s.errors);

    return (
        <>
            <div>
                <Label className="text-xs font-medium text-foreground/80">
                    Client
                </Label>
                <div className="mt-1.5 flex items-center gap-2 px-3 py-2 rounded-md border border-input bg-muted/40 text-sm text-foreground/80">
                    {clientLoading ? "Loading…" : (clientName ?? "Unknown client")}
                </div>
            </div>
            <div>
                <FloatingInput
                    label="Server name"
                    value={form.name}
                    onValueChange={store.set("name")}
                    error={errors.name}
                />
            </div>

            <div>
                <FloatingInput
                    label="Subscription Fee (₱ / mo)"
                    inputBg="bg-card"
                    type="number"
                    step="0.01"
                    min="0"
                    value={String(form.subscription_fee ?? "")}
                    onKeyDown={blockInvalidSubscriptionFeeKey}
                    onPaste={blockInvalidSubscriptionFeePaste}
                    onValueChange={(value) =>
                        setSubscriptionFeeValue(store.set("subscription_fee"), value)
                    }
                    error={errors.monthly_cost}
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
                    className={cn(
                        "w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none",
                        errors.description && "border-destructive",
                    )}
                />
                {errors.description ? (
                    <p className="text-[11px] text-destructive">
                        {errors.description}
                    </p>
                ) : (
                    <p className="text-[11px] text-muted-foreground">
                        Notes about this server's role or purpose.
                    </p>
                )}
            </div>
        </>
    );
}