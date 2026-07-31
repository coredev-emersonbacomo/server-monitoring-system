import type { KeyboardEvent, ClipboardEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2, Cpu, MemoryStick, HardDrive, Monitor } from "lucide-react";
import api from "@/api/api";
import { Form } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useServerDetailContext } from "../context/ServerDetailContext";
import { DeleteModalDangerZone } from "../dialogs/DeleteModalDangerZone";

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

export function ServerInfoTab() {
    const {
        store,
        initial,
        server,
        mode,
        form,
        navigate,
    } = useServerDetailContext();
    const queryClient = useQueryClient();

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
                        const costNum =
                            data.monthly_cost !== undefined &&
                                data.monthly_cost !== null &&
                                data.monthly_cost !== ""
                                ? Number(data.monthly_cost)
                                : 0;

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
                                    name: nameStr,
                                    description: descStr || undefined,
                                    monthly_cost: isNaN(costNum)
                                        ? 0
                                        : Math.max(0, costNum),
                                },
                            },
                        );
                        if (error) {
                            toast.error("Failed to update server info.");
                        } else {
                            toast.success("Server info updated.");
                            store.setMode("view");
                            queryClient.invalidateQueries({
                                queryKey: ["server", initial.uuid],
                            });
                        }
                    } catch {
                        toast.error("An error occurred.");
                    }
                }}
            />
            <div className="flex flex-col gap-3 p-4 bg-card border border-t-0 border-b-0 border-border/60">
                <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                        {mode !== "view" ? (
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
                    <>
                        <div>
                            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                                Monthly Cost (₱ / mo)
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={form.monthly_cost ?? ""}
                                onKeyDown={blockInvalidMonthlyCostKey}
                                onPaste={blockInvalidMonthlyCostPaste}
                                onChange={(e) =>
                                    setMonthlyCostValue(
                                        store.set("monthly_cost"),
                                        e.target.value,
                                    )
                                }
                                className="text-sm font-mono"
                            />
                        </div>
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
                    </>
                )}
            </div>
            <div className="flex flex-wrap items-start gap-3 p-4 bg-card border border-t-0 border-border/60 rounded-b-lg">
                {[
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
        </Form.Root>
    );
}
