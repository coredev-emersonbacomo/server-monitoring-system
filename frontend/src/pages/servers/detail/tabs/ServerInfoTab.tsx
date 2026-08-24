import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    Building2,
    Cpu,
    MemoryStick,
    HardDrive,
    Monitor,
    Banknote,
    AlertTriangle,
} from "lucide-react";
import api from "@/api/api";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useServerDetailContext } from "../context/ServerDetailContext";
import { DeleteModalDangerZone } from "../dialogs/DeleteModalDangerZone";
import { useClient, useClientServers } from "@/hooks/useClients";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useFormattedNumberInput } from "@/hooks/useFormattedNumberInput";
import { formatCurrency } from "@/utils/helpers";
export function ServerInfoTab() {
    const { store, initial, server, mode, form, navigate } =
        useServerDetailContext();
    const queryClient = useQueryClient();

    const { data: client } = useClient(initial?.client_uuid ?? "");
    const { data: clientServers = [] } = useClientServers(
        initial?.client_uuid ?? "",
    );

    const [budgetWarning, setBudgetWarning] = useState<{
        newTotal: number;
        budget: number;
        pendingPayload: { nameStr: string; descStr: string; feeNum: number };
    } | null>(null);


    const executeUpdateServer = async (payload: {
        nameStr: string;
        descStr: string;
        feeNum: number;
    }) => {
        const { error } = await api.PATCH(
            "/v1/clients/{clientUuid}/servers/{serverUuid}",
            {
                params: {
                    path: {
                        clientUuid: initial.client_uuid,
                        serverUuid: initial.uuid,
                    },
                },
                body: {
                    name: payload.nameStr,
                    description: payload.descStr || undefined,
                    subscription_fee: payload.feeNum,
                },
            },
        );
        if (error) {
            toast.error("Failed to update server info.");
        } else {
            toast.success("Server info updated.");
            const newForm = {
                name: payload.nameStr,
                description: payload.descStr,
                subscription_fee: payload.feeNum,
            };
            store.setState({
                form: newForm,
                originalData: newForm,
                externalDirty: false,
                hasChanges: false,
            });
            store.setMode("view");
            queryClient.invalidateQueries({
                queryKey: ["server", initial.uuid],
            });
            queryClient.invalidateQueries({
                queryKey: ["clients", initial.client_uuid],
            });
        }
    };

    const { inputRef, formatValue, handleChange, handleKeyDown, handlePaste } =
        useFormattedNumberInput();

    return (
        <Form.Root store={store}>
            <Form.SubmitHandler
                handler={async (data: Record<string, unknown>) => {
                    if (!initial?.client_uuid) {
                        toast.error(
                            "Missing client reference for this server.",
                        );
                        return;
                    }
                    try {
                        const nameStr = data.name
                            ? String(data.name).trim()
                            : "";
                        const descStr =
                            data.description &&
                                String(data.description).trim() !== "undefined" &&
                                String(data.description).trim() !== "null"
                                ? String(data.description).trim()
                                : "";
                        const feeNum =
                            typeof data.subscription_fee === "number"
                                ? data.subscription_fee
                                : parseFloat(
                                    String(data.subscription_fee || 0),
                                ) || 0;

                        const clientBudget = Number(client?.budget) || 0;
                        const currentOtherServersFee = (clientServers ?? [])
                            .filter((s) => s.uuid !== initial.uuid)
                            .reduce(
                                (acc, s) =>
                                    acc + (Number(s.subscription_fee) || 0),
                                0,
                            );
                        const newTotalFee = currentOtherServersFee + feeNum;

                        if (newTotalFee > clientBudget) {
                            setBudgetWarning({
                                newTotal: newTotalFee,
                                budget: clientBudget,
                                pendingPayload: { nameStr, descStr, feeNum },
                            });
                            return;
                        }

                        await executeUpdateServer({ nameStr, descStr, feeNum });
                    } catch {
                        toast.error("An error occurred.");
                    }
                }}
            />
            <div className="flex flex-col gap-3 p-4 bg-card border border-t-0 border-b-0 border-border/60">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        {mode !== "view" ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                                        Server name
                                    </label>
                                    <Input
                                        value={form.name}
                                        onChange={(e) =>
                                            store.set("name")(e.target.value)
                                        }
                                        className="text-sm"
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                                        Subscription Fee (₱ / mo)
                                    </label>
                                    <Input
                                        ref={inputRef}
                                        type="text"
                                        inputMode="decimal"
                                        value={formatValue(String(form.subscription_fee ?? 0))}
                                        onChange={(e) => {
                                            const el = inputRef.current;
                                            const cursorPos = el?.selectionStart ?? e.target.value.length;
                                            handleChange(e.target.value, cursorPos, (unformatted) => {
                                                store.set("subscription_fee")(unformatted);
                                            });
                                        }}
                                        onKeyDown={handleKeyDown}
                                        onPaste={handlePaste}
                                        className="text-sm"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="flex flex-col gap-1.5">
                                    <h3 className="text-2xl font-semibold text-foreground">
                                        {form.name}
                                    </h3>
                                    {initial?.client_uuid &&
                                        initial?.client_name && (
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    navigate(
                                                        `/clients/${initial.client_uuid}`,
                                                    )
                                                }
                                                className="inline-flex items-center gap-1.5 w-fit text-xs font-medium text-muted-foreground border-b border-transparent hover:text-primary hover:border-primary/40 transition-colors cursor-pointer"
                                                title={`Go to ${initial.client_name}`}
                                            >
                                                <Building2
                                                    size={11}
                                                    className="shrink-0 opacity-70"
                                                />
                                                {initial.client_name}
                                            </button>
                                        )}
                                </div>
                                {form.description && (
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {form.description}
                                    </p>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {mode !== "view" ? (
                            <>
                                <Form.Buttons.Cancel />
                                <Form.Buttons.Submit />
                            </>
                        ) : (
                            <Form.Buttons.Edit />
                        )}
                    </div>
                </div>

                {mode !== "view" && (
                    <div>
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                            Description
                        </label>
                        <textarea
                            value={form.description}
                            onChange={(e) =>
                                store.set("description")(e.target.value)
                            }
                            rows={2}
                            maxLength={255}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                        />
                    </div>
                )}
            </div>
            <div className="flex flex-wrap items-start gap-3 p-4 bg-card border border-t-0 border-border/60 rounded-b-lg">
                {[
                    {
                        icon: Banknote,
                        label: "Subscription Fee",
                        value: `${formatCurrency(form.subscription_fee, { suffix: " / mo" })}`,
                    },
                    {
                        icon: Cpu,
                        label: "CPU Model",
                        value: server.cpu_model ?? "Unknown",
                        wide: true,
                    },
                    {
                        icon: Cpu,
                        label: "CPU Cores",
                        value: `${server.cpu_cores ?? "?"} cores`,
                    },
                    {
                        icon: MemoryStick,
                        label: "Memory",
                        value: server.ram
                            ? `${server.ram} GB`
                            : "Waiting for Agent",
                    },
                    {
                        icon: HardDrive,
                        label: "Disk",
                        value: server.disk
                            ? `${server.disk} GB`
                            : "Waiting for Agent",
                    },
                    {
                        icon: Monitor,
                        label: "OS",
                        value: server.operating_system ?? "Waiting for Agent",
                    },
                ].map(({ icon: ItemIcon, label, value, wide }) => (
                    <div
                        key={label}
                        className={cn(
                            "group flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/60 shadow-sm hover:shadow-md hover:border-border transition-all",
                            wide
                                ? "flex-[2_2_320px] min-w-[320px]"
                                : "flex-1 min-w-50",
                        )}
                    >
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:bg-primary/15 transition-colors">
                            <ItemIcon size={17} />
                        </div>
                        <div className="flex flex-col min-w-0 gap-0.5">
                            <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/80">
                                {label}
                            </span>
                            <span className="text-sm font-semibold text-foreground wrap-break-word whitespace-nowrap overflow-hidden text-ellipsis">
                                {value}
                            </span>
                        </div>
                    </div>
                ))}
            </div>

            <DeleteModalDangerZone />

            {/* Budget Exceeded Warning Dialog */}
            <Dialog
                open={!!budgetWarning}
                onOpenChange={(open) => !open && setBudgetWarning(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-amber-500">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            Budget Exceeded Warning
                        </DialogTitle>
                    </DialogHeader>

                    <div className="py-3 text-sm text-foreground/90 flex flex-col gap-3">
                        <p>
                            Updating this server's subscription fee will push
                            the client's total monthly subscription fees over
                            its allocated budget limit.
                        </p>

                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs space-y-1.5">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    Monthly Budget Limit:
                                </span>
                                <span className="font-semibold text-foreground">
                                    ₱
                                    {(
                                        budgetWarning?.budget ?? 0
                                    ).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">
                                    New Total Subscription Fees:
                                </span>
                                <span className="font-semibold text-amber-500">
                                    ₱
                                    {(
                                        budgetWarning?.newTotal ?? 0
                                    ).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                            <div className="flex justify-between border-t border-amber-500/20 pt-1.5">
                                <span className="text-muted-foreground">
                                    Amount Exceeded:
                                </span>
                                <span className="font-bold text-destructive">
                                    ₱
                                    {(
                                        (budgetWarning?.newTotal ?? 0) -
                                        (budgetWarning?.budget ?? 0)
                                    ).toLocaleString(undefined, {
                                        minimumFractionDigits: 2,
                                    })}
                                </span>
                            </div>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Do you still want to proceed and save this update?
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
                                    const payload =
                                        budgetWarning.pendingPayload;
                                    setBudgetWarning(null);
                                    await executeUpdateServer(payload);
                                }
                            }}
                        >
                            Proceed Anyway
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Form.Root>
    );
}
