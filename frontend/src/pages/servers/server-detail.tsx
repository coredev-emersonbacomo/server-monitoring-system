import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";
import {
Wifi,
WifiOff,
AlertTriangle,
Trash2,
Cpu,
MemoryStick,
HardDrive,
Monitor,
Info,
BarChart3,
Bell,
Terminal,
Copy,
Check,
RefreshCw,
ArrowLeft,
Loader2,
Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useServer } from "@/hooks/useServer";
import {
useServerSocket,
useLiveStats,
type WsStatus,
} from "@/hooks/useServerSocket";
import PageLayout from "@/components/PageLayout";
import { ChartZoomProvider } from "@/contexts/ChartZoomContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tab } from "@/components/ui/tab";
import { ServerStatChart } from "@/components/dashboard/ServerStatChart";
import type { StatPointData, ProvisionDetailData } from "@/types/models";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import {
DialogContent,
DialogHeader,
DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useDeleteServer } from "@/hooks/useDeleteServer";
import { NodeConfigEditor } from "@/components/node-config/NodeConfigEditor";
import { Form, createFormStore, useForm } from "@/components/ui/form";

const serverInfoSchema = z.object({
name: z.string().min(1, "Server name is required."),
description: z.string(),
});

// ─── Server Alert Tab ────────────────────────────────────────────────────────

function useServerAlertTab(
serverUuid: string,
serverName: string,
clientUuid: string | null,
clientName: string | null,
initialScope?: string,
) {
const queryClient = useQueryClient();
const [alertScope, setAlertScopeState] = useState<
    "global" | "client" | "server"
>("global");
const hydratedRef = useRef(false);
useEffect(() => {
    if (!hydratedRef.current && initialScope) {
        hydratedRef.current = true;
        setAlertScopeState(initialScope as "global" | "client" | "server");
    }
}, [initialScope]);

const configKey =
    alertScope === "server"
        ? `server_${serverUuid}`
        : alertScope === "client" && clientUuid
          ? `client_${clientUuid}`
          : "alerts";
const scopeLabel =
    alertScope === "global"
        ? "Global"
        : alertScope === "client"
          ? `Client: ${clientName ?? "Unknown"}`
          : `Server: ${serverName}`;

const setAlertScope = useCallback(
    (scope: "global" | "client" | "server") => {
        setAlertScopeState(scope);
        api.PATCH(
            "/v1/clients/{clientUuid}/servers/{serverUuid}/alert-scope",
            {
                params: { path: { clientUuid: clientUuid!, serverUuid } },
                body: { alert_scope: scope },
            },
        ).then(() => {
            queryClient.invalidateQueries({
                queryKey: ["server", serverUuid],
            });
        });
    },
    [serverUuid, clientUuid, queryClient],
);

return {
    alertScope,
    setAlertScope,
    configKey,
    scopeLabel,
    clientUuid,
};
}

const STATUS_CONFIG = {
online: {
    label: "Online",
    icon: Wifi,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
},
warning: {
    label: "Warning",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
},
offline: {
    label: "Offline",
    icon: WifiOff,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
},
pending_installation: {
    label: "Pending Installation",
    icon: AlertTriangle,
    color: "text-zinc-400",
    bg: "bg-zinc-500/10 border-zinc-500/20",
},
waiting_for_installation: {
    label: "Waiting for Installation",
    icon: AlertTriangle,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
},
waiting_for_first_heartbeat: {
    label: "Waiting for Heartbeat",
    icon: WifiOff,
    color: "text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/20",
},
archived: {
    label: "Archived",
    icon: WifiOff,
    color: "text-slate-400",
    bg: "bg-slate-500/10 border-slate-500/20",
},
} as const;

const CHARTS = [
{
    title: "CPU",
    dataKey: "cpu" as const,
    color: "#8b5cf6",
    unit: "%",
    yDomain: [0, 100] as [number | "auto", number | "auto"],
},
{
    title: "Memory",
    dataKey: "memory" as const,
    color: "#10b981",
    unit: "%",
    yDomain: [0, 100] as [number | "auto", number | "auto"],
},
{
    title: "Net In",
    dataKey: "netIn" as const,
    color: "#f59e0b",
    unit: " MB/s",
},
{
    title: "Net Out",
    dataKey: "netOut" as const,
    color: "#f43f5e",
    unit: " MB/s",
},
{
    title: "Disk",
    dataKey: "disk" as const,
    color: "#3b82f6",
    unit: "%",
    yDomain: [0, 100] as [number | "auto", number | "auto"],
},
];

export default function ServerDetail() {
const { uuid } = useParams<{ uuid: string }>();
const navigate = useNavigate();
const [searchParams] = useSearchParams();
const allClient = searchParams.get("client") === "all";

type TimeSpan = "1H" | "1D" | "1W" | "1M" | "3M" | "6M" | "1Y" | "3Y" | "6Y" | "9Y" | "12Y" | "Custom";
const [timeSpan, setTimeSpan] = useState<TimeSpan>("1H");

// For Custom range
const [customFrom, setCustomFrom] = useState<string>("");
const [customTo, setCustomTo] = useState<string>("");
const [customUnitStr, setCustomUnitStr] = useState<string>("auto");

const timeSpanArgs = useMemo(() => {
    if (timeSpan === "Custom") {
        if (!customFrom || !customTo) return { subtract: "-1 hour", unit: 1 };

        const fromTime = new Date(customFrom).getTime();
        const toTime = new Date(customTo).getTime();
        const diffHours = (toTime - fromTime) / (1000 * 60 * 60);

        let minUnit = 1; // Minute
        if (diffHours > 24 * 365) minUnit = 5; // Month
        else if (diffHours > 24 * 31) minUnit = 4; // Week
        else if (diffHours > 48) minUnit = 3; // Day
        else if (diffHours > 2) minUnit = 2; // Hour

        let unit = customUnitStr === "auto" ? minUnit : parseInt(customUnitStr, 10);
        if (unit < minUnit) unit = minUnit;

        return {
            subtract: undefined,
            unit,
            minUnit,
            fromTime: new Date(customFrom).toISOString(),
            toTime: new Date(customTo).toISOString(),
        };
    }

    switch (timeSpan) {
        case "1H":
            return { subtract: "-1 hour", unit: 1 };   // Minute data points
        case "1D":
            return { subtract: "-1 day", unit: 2 };    // Hour data points
        case "1W":
            return { subtract: "-1 week", unit: 3 };   // Day data points
        case "1M":
            return { subtract: "-1 month", unit: 4 };  // Week data points
        case "3M":
            return { subtract: "-3 months", unit: 4 }; // Week data points
        case "6M":
            return { subtract: "-6 months", unit: 4 }; // Week data points
        case "1Y":
            return { subtract: "-1 year", unit: 5 };   // Month data points
        case "3Y":
            return { subtract: "-3 years", unit: 5 };  // Month data points
        case "6Y":
            return { subtract: "-6 years", unit: 5 };  // Month data points
        case "9Y":
            return { subtract: "-9 years", unit: 5 };  // Month data points
        case "12Y":
            return { subtract: "-12 years", unit: 5 }; // Month data points
    }
}, [timeSpan, customFrom, customTo, customUnitStr]);

const { data: initial, isLoading, isError } = useServer(
    uuid!, {
        timeSubtract: timeSpanArgs?.subtract,
        timeUnit: timeSpanArgs?.unit,
        fromTime: (timeSpanArgs as any)?.fromTime,
        toTime: (timeSpanArgs as any)?.toTime,
    }
);
const [, setWsStatus] = useState<WsStatus>("connecting");
const [history, setHistory] = useState<StatPointData[]>([]);

const queryClient = useQueryClient();
const serverAlertTab = useServerAlertTab(
    uuid!,
    initial?.name ?? "Unknown",
    initial?.client_uuid ?? null,
    initial?.client_name ?? null,
    (initial as Record<string, unknown>)?.alert_scope as string | undefined,
);
const [provisionDetails, setProvisionDetails] =
    useState<ProvisionDetailData | null>(
        initial?.activeProvisionDetails ?? null,
    );
const [generating, setGenerating] = useState(false);
const [copiedKey, setCopiedKey] = useState<
    "linux" | "windows" | "uninstall_linux" | "uninstall_windows" | null
>(null);
const [timeLeft, setTimeLeft] = useState<string>("");

const store = useMemo(
    () =>
        createFormStore({
            schema: serverInfoSchema,
            originalData: initial
                ? {
                      name: initial.name,
                      description: initial.description ?? "",
                  }
                : null,
            initialMode: "view",
        }),
    [initial],
);

const form = useForm(
    store,
    (s) => s.form as z.infer<typeof serverInfoSchema>,
);
const mode = useForm(store, (s) => s.mode);
const [confirmText, setConfirmText] = useState("");
const deleteServer = useDeleteServer();
const isConfirmed = initial ? confirmText.trim() === initial.name : false;

useServerSocket(uuid!, setWsStatus, () => {
    toast.success("Agent successfully uninstalled!");
    queryClient.invalidateQueries({
        queryKey: ["server", uuid],
    });
});

const live = useLiveStats(uuid!);

useEffect(() => {
    if (!live) return;
    setHistory((prev) => {
        if (timeSpan !== "1H") return prev; // Do not mix live minutely data with aggregated data
        const next = [...prev, live as unknown as StatPointData];
        return next.length > 144 ? next.slice(next.length - 144) : next;
    });
}, [live, timeSpan]);

useEffect(() => {
    setHistory([]); // clear history when changing timespan
}, [timeSpan]);

const { setTrail } = useBreadcrumb();
useEffect(() => {
    if (!initial) {
        if (allClient) {
            setTrail([{ label: "" }, { label: "" }], true);
        } else {
            setTrail([{ label: "" }, { label: "" }, { label: "" }], true);
        }
        return;
    }

    if (allClient) {
        setTrail(
            [
                { label: "Servers", href: "/servers" },
                { label: initial.name },
            ],
            false,
        );
    } else {
        setTrail(
            [
                { label: "Clients", href: "/clients" },
                {
                    label: initial.client_name,
                    href: `/clients/${initial.client_uuid}`,
                },
                { label: initial.name },
            ],
            false,
        );
    }
}, [initial, setTrail, uuid, allClient]);

useEffect(() => {
    setProvisionDetails(initial?.activeProvisionDetails ?? null);
}, [initial?.activeProvisionDetails]);

useEffect(() => {
    if (!provisionDetails?.expires_at) {
        setTimeLeft("");
        return;
    }

    const updateCountdown = () => {
        const expires = new Date(provisionDetails.expires_at!).getTime();
        const now = new Date().getTime();
        const diff = expires - now;

        if (diff <= 0) {
            setTimeLeft("Expired");
            return;
        }

        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);

        setTimeLeft(`(${minutes}m ${seconds}s remaining)`);
    };

    updateCountdown();
    const intervalId = setInterval(updateCountdown, 1000);
    return () => clearInterval(intervalId);
}, [provisionDetails?.expires_at]);

const generateProvisionToken = async () => {
    if (!initial) return;
    setGenerating(true);
    try {
        const { data, error, response } = await api.POST(
            "/v1/servers/{uuid}/provision",
            {
                params: { path: { uuid: initial.uuid } },
            },
        );
        if (error) {
            if (response?.status === 409) {
                setProvisionDetails(
                    error as unknown as ProvisionDetailData,
                );
            } else {
                toast.error("Failed to generate provision token.");
            }
        } else if (data) {
            setProvisionDetails(data);
            toast.success("Provision token generated successfully!");
            queryClient.setQueryData(["server", initial.uuid], (old: typeof initial) =>
            old ? { ...old, activeProvisionDetails: data } : old
           );
        }
    } catch {
        toast.error("An error occurred.");
    } finally {
        setGenerating(false);
    }
};

const regenerateProvisionToken = async () => {
    if (!initial) return;
    setGenerating(true);
    try {
        const { data, error } = await api.POST(
            "/v1/servers/{uuid}/provision/regenerate",
            {
                params: { path: { uuid: initial.uuid } },
            },
        );
        if (error) {
            toast.error("Failed to regenerate token.");
        } else if (data) {
            setProvisionDetails(data);
            toast.success("Provision token regenerated!");
            queryClient.setQueryData(["server", initial.uuid], (old: typeof initial) =>
                old ? { ...old, activeProvisionDetails: data } : old
            );
        }
    } catch {
        toast.error("An error occurred.");
    } finally {
        setGenerating(false);
    }
};

const copyToClipboard = (
    text: string,
    type: "linux" | "windows" | "uninstall_linux" | "uninstall_windows",
) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(type);
    toast.success("Command copied to clipboard!");
    setTimeout(() => setCopiedKey(null), 2000);
};

const handleDeletePort = async (portId: number) => {
    if (!initial) return;
    if (!confirm("Are you sure you want to delete this tracked port?"))
        return;
    try {
        await api.DELETE("/v1/ports/{id}", {
            params: { path: { id: portId } },
        });
        toast.success("Tracked port deleted successfully!");
        queryClient.setQueryData(["server", initial.uuid], (old: typeof initial) =>
            old ? { ...old, ports: old.ports?.filter((p) => p.id !== portId) } : old
        );
    } catch {
        toast.error("Failed to delete port.");
    }
};

    const startEditInfo = () => {
        if (!initial) return;
        setEditName(initial.name);
        setEditDescription(initial.description ?? "");
        setIsEditingInfo(true);
    };

    const cancelEditInfo = () => {
        setIsEditingInfo(false);
    };

    const saveInfo = async () => {
        if (!initial) return;
        if (!editName.trim()) {
            toast.error("Server name is required.");
            return;
        }
        if (!initial.client_uuid) {
            toast.error("Missing client reference for this server.");
            return;
        }
        setSavingInfo(true);
        try {
            const { error } = await (api.PATCH as any)(
                "/v1/clients/{clientUuid}/servers/{serverUuid}",
                {
                    params: {
                        path: {
                            clientUuid: initial.client_uuid,
                            serverUuid: initial.uuid,
                        },
                    },
                    body: {
                        name: editName.trim(),
                        description: editDescription.trim() || undefined,
                    },
                },
            );
            if (error) {
                toast.error("Failed to update server info.");
            } else {
                toast.success("Server info updated.");
                setIsEditingInfo(false);
                queryClient.setQueryData(["server", initial.uuid], (old: typeof initial) =>
                    old
                        ? {
                              ...old,
                              name: editName.trim(),
                              description: editDescription.trim() || undefined,
                          }
                        : old
                );
          }
        } catch {
            toast.error("An error occurred.");
        } finally {
            setSavingInfo(false);
        }
    };

    const resetDialog = () => {
        setShowDelete(false);
        setConfirmText("");
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 size={28} className="animate-spin opacity-40" />
                <p className="text-sm">Loading server details…</p>
            </div>
        );
    }

    if (isError || !initial) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <AlertTriangle size={28} className="opacity-40" />
                <p className="text-sm">Server not found.</p>
                <Button
                    variant="outline"
                    size="sm"
                    icon={<ArrowLeft size={14} />}
                    label="Back"
                    onClick={() => navigate("/")}
                />
            </div>
        );
    }

    const server = {
        ...initial,
        stats:
            history.length > 0
                ? [...(initial.stats ?? []), ...history]
                : initial.stats,
    };
    const status =
        (server.status as keyof typeof STATUS_CONFIG) || "pending_installation";
    const { icon: StatusIcon, label, color, bg } = STATUS_CONFIG[status];
    const isInstalled =
        status === "online" || status === "warning" || status === "offline";

    return (
        <ChartZoomProvider>
            <PageLayout>
                <main className="py-3 w-full flex-1">
                    <div className="py-5 px-5">
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
                            <span
                                className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${bg} ${color}`}
                            >
                                <StatusIcon size={14} />
                                {label}
                            </span>
                        </div>

                        {!isInstalled && (
                            <div className="mb-6 p-5 rounded-xl border border-border bg-card/50 backdrop-blur-sm shadow-lg">
                                <div className="flex items-center gap-2.5 mb-4 text-foreground font-semibold">
                                    <Terminal className="size-5 text-primary" />
                                    <h2>Agent Installation Guide</h2>
                                </div>

                                {status === "pending_installation" &&
                                    !provisionDetails && (
                                        <div className="space-y-4">
                                            <p className="text-sm text-muted-foreground">
                                                To start monitoring this server,
                                                you must install the lightweight
                                                monitoring agent on the machine.
                                            </p>
                                            <Button
                                                variant="default"
                                                label={
                                                    generating
                                                        ? "Generating..."
                                                        : "Generate Installation Command"
                                                }
                                                onClick={generateProvisionToken}
                                                disabled={generating}
                                            />
                                        </div>
                                    )}

                                {(status === "waiting_for_installation" ||
                                    status === "waiting_for_first_heartbeat" ||
                                    provisionDetails) && (
                                    <div className="space-y-5">
                                        <p className="text-sm text-muted-foreground">
                                            Run the appropriate command directly
                                            on your server.
                                        </p>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                                                    Linux (cURL + bash)
                                                </label>
                                                <div className="flex items-center gap-2 bg-muted/60 p-2.5 rounded-lg border border-border/80 font-mono text-xs overflow-x-auto select-all">
                                                    <span className="flex-1 whitespace-pre-wrap break-all text-foreground">
                                                        {provisionDetails?.linux_command ||
                                                            `sudo curl -fsSL ${window.location.origin}/install/linux | sudo bash -s -- <token>`}
                                                    </span>
                                                    {provisionDetails?.linux_command && (
                                                        <button
                                                            onClick={() =>
                                                                copyToClipboard(
                                                                    provisionDetails.linux_command!,
                                                                    "linux",
                                                                )
                                                            }
                                                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                                        >
                                                            {copiedKey ===
                                                            "linux" ? (
                                                                <Check className="size-4 text-emerald-400" />
                                                            ) : (
                                                                <Copy className="size-4" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                                                    Windows (PowerShell)
                                                </label>
                                                <div className="flex items-center gap-2 bg-muted/60 p-2.5 rounded-lg border border-border/80 font-mono text-xs overflow-x-auto select-all">
                                                    <span className="flex-1 whitespace-pre-wrap break-all text-foreground">
                                                        {provisionDetails?.windows_command ||
                                                            `powershell -ExecutionPolicy Bypass -Command "$token='<token>'; irm ${window.location.origin}/install/windows.ps1 | iex"`}
                                                    </span>
                                                    {provisionDetails?.windows_command && (
                                                        <button
                                                            onClick={() =>
                                                                copyToClipboard(
                                                                    provisionDetails.windows_command!,
                                                                    "windows",
                                                                )
                                                            }
                                                            className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                                        >
                                                            {copiedKey ===
                                                            "windows" ? (
                                                                <Check className="size-4 text-emerald-400" />
                                                            ) : (
                                                                <Copy className="size-4" />
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/40 text-xs text-muted-foreground">
                                            <div>
                                                {provisionDetails?.expires_at && (
                                                    <span>
                                                        Token expires at:{" "}
                                                        <strong>
                                                            {new Date(
                                                                provisionDetails.expires_at,
                                                            ).toLocaleString()}
                                                        </strong>{" "}
                                                        <span className="text-amber-500 font-mono ml-1.5">
                                                            {timeLeft}
                                                        </span>
                                                    </span>
                                                )}
                                            </div>
                                            <button
                                                onClick={
                                                    regenerateProvisionToken
                                                }
                                                className="flex items-center gap-1.5 text-primary hover:text-primary/80 transition-colors font-medium cursor-pointer"
                                            >
                                                <RefreshCw size={12} />
                                                Regenerate Token
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        <Tab>
                            <Tab.Item icon={Info} title="Info">
                                <Form.Root store={store}>
                                    <Form.SubmitHandler
                                        handler={async (
                                            data: Record<string, unknown>,
                                        ) => {
                                            if (!initial?.client_uuid) {
                                                toast.error(
                                                    "Missing client reference for this server.",
                                                );
                                                return;
                                            }
                                            try {
                                                const { error } =
                                                    await api.PATCH(
                                                        "/v1/clients/{clientUuid}/servers/{serverUuid}",
                                                        {
                                                            params: {
                                                                path: {
                                                                    clientUuid:
                                                                        initial.client_uuid,
                                                                    serverUuid:
                                                                        initial.uuid,
                                                                },
                                                            },
                                                            body: {
                                                                name: String(
                                                                    data.name,
                                                                ).trim(),
                                                                description:
                                                                    String(
                                                                        data.description,
                                                                    ).trim() ||
                                                                    undefined,
                                                            },
                                                        },
                                                    );
                                                if (error) {
                                                    toast.error(
                                                        "Failed to update server info.",
                                                    );
                                                } else {
                                                    toast.success(
                                                        "Server info updated.",
                                                    );
                                                    store.setMode("view");
                                                    queryClient.invalidateQueries(
                                                        {
                                                            queryKey: [
                                                                "server",
                                                                initial.uuid,
                                                            ],
                                                        },
                                                    );
                                                }
                                            } catch {
                                                toast.error(
                                                    "An error occurred.",
                                                );
                                            }
                                        }}
                                    />
                                    <div className="flex flex-col gap-1 p-4 bg-card border border-t-0 border-b-0 border-border/60">
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
                                                                store.set("name")(
                                                                    e.target.value,
                                                                )
                                                            }
                                                            className="text-sm"
                                                            autoFocus
                                                        />
                                                    </div>
                                                ) : (
                                                    <h3 className="text-2xl font-semibold text-foreground">
                                                        {form.name}
                                                    </h3>
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

                                        {mode !== "view" ? (
                                            <div>
                                                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                                                    Description
                                                </label>
                                                <textarea
                                                    value={form.description}
                                                    onChange={(e) =>
                                                        store.set(
                                                            "description",
                                                        )(e.target.value)
                                                    }
                                                    rows={2}
                                                    maxLength={255}
                                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                                                />
                                            </div>
                                        ) : (
                                            form.description && (
                                                <p className="text-sm text-muted-foreground">
                                                    {form.description}
                                                </p>
                                            )
                                        )}

                                    </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-card border border-t-0 border-border/60 rounded-b-lg">
                                    {[
                                        {
                                            icon: Cpu,
                                            label: "CPU Model",
                                            value:
                                                server.cpu_model ?? "Unknown",
                                            span: true,
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
                                            value:
                                                server.operating_system ??
                                                "Waiting for Agent",
                                        },
                                    ].map(
                                        ({
                                            icon: ItemIcon,
                                            label,
                                            value,
                                            span,
                                        }) => (
                                            <div
                                                key={label}
                                                className={cn(
                                                    "group flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/60 shadow-sm hover:shadow-md hover:border-border transition-all",
                                                    span && "sm:col-span-2",
                                                )}
                                            >
                                                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0 group-hover:bg-primary/15 transition-colors">
                                                    <ItemIcon size={17} />
                                                </div>
                                                <div className="flex flex-col min-w-0 gap-0.5">
                                                    <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/80">
                                                        {label}
                                                    </span>
                                                    <span className="text-sm font-semibold text-foreground wrap-break-word">
                                                        {value}
                                                    </span>
                                                </div>
                                            </div>
                                        ),
                                    )}
                                </div>

                                <div className="mt-6 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                                    <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3">
                                        Danger Zone
                                    </p>
                                    <Form.DeleteModal
                                        buttonProps={{
                                            variant: "danger",
                                            size: "sm",
                                            icon: <Trash2 size={13} />,
                                        }}
                                        onOpenChange={(open) => {
                                            if (!open) setConfirmText("");
                                        }}
                                        modal={(show) => (
                                            <DialogContent className="sm:max-w-md">
                                                <DialogHeader>
                                                    <DialogTitle className="flex items-center gap-2 text-destructive">
                                                        <Trash2 size={16} />
                                                        Delete server
                                                    </DialogTitle>
                                                </DialogHeader>

                                                <p className="text-sm text-muted-foreground">
                                                    This will permanently stop monitoring{" "}
                                                    <strong className="text-foreground">
                                                        {initial?.name}
                                                    </strong>{" "}
                                                    and remove all collected metrics. This cannot be undone.
                                                </p>

                                                {initial &&
                                                    !initial.agent_deleted && (
                                                        <div className="flex flex-col gap-3 p-3.5 bg-destructive/5 border border-destructive/20 rounded-lg text-xs text-destructive">
                                                            <div className="flex items-start gap-2">
                                                                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                                                                <div>
                                                                    <p className="font-semibold text-foreground">
                                                                        Agent Uninstallation Required
                                                                    </p>
                                                                    <p className="text-muted-foreground mt-0.5">
                                                                        You must uninstall the agent service from the target machine before you can delete this server. Run the command for your operating system:
                                                                    </p>
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col gap-2.5 mt-1 text-foreground">
                                                                <div>
                                                                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                                                        Linux (bash)
                                                                    </label>
                                                                    <div className="flex items-center gap-2 bg-background p-2 rounded border border-border font-mono text-[11px] overflow-x-auto select-all">
                                                                        <span className="flex-1 whitespace-pre-wrap break-all">
                                                                            {initial.uninstall_linux_command}
                                                                        </span>
                                                                        <button
                                                                            onClick={() =>
                                                                                copyToClipboard(
                                                                                    initial.uninstall_linux_command!,
                                                                                    "uninstall_linux",
                                                                                )
                                                                            }
                                                                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                                                        >
                                                                            {copiedKey === "uninstall_linux" ? (
                                                                                <Check className="size-3.5 text-emerald-400" />
                                                                            ) : (
                                                                                <Copy className="size-3.5" />
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                                                        Windows (PowerShell)
                                                                    </label>
                                                                    <div className="flex items-center gap-2 bg-background p-2 rounded border border-border font-mono text-[11px] overflow-x-auto select-all">
                                                                        <span className="flex-1 whitespace-pre-wrap break-all">
                                                                            {initial.uninstall_windows_command}
                                                                        </span>
                                                                        <button
                                                                            onClick={() =>
                                                                                copyToClipboard(
                                                                                    initial.uninstall_windows_command!,
                                                                                    "uninstall_windows",
                                                                                )
                                                                            }
                                                                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                                                        >
                                                                            {copiedKey === "uninstall_windows" ? (
                                                                                <Check className="size-3.5 text-emerald-400" />
                                                                            ) : (
                                                                                <Copy className="size-3.5" />
                                                                            )}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}

                                                <div className="flex flex-col gap-2 pt-1">
                                                    <label className="text-xs text-muted-foreground">
                                                        Type{" "}
                                                        <strong className="text-foreground font-mono">
                                                            {initial?.name}
                                                        </strong>{" "}
                                                        to confirm
                                                    </label>
                                                    <Input
                                                        value={confirmText}
                                                        onChange={(e) =>
                                                            setConfirmText(e.target.value)
                                                        }
                                                        placeholder={initial?.name}
                                                        autoFocus
                                                        className="font-mono text-sm"
                                                    />
                                                </div>

                                                <div className="flex justify-end gap-3 pt-2">
                                                    <Form.Buttons.Cancel
                                                        onClick={() => {
                                                            show(false);
                                                            setConfirmText("");
                                                        }}
                                                    />
                                                    <Form.Button
                                                        variant="danger"
                                                        disabled={
                                                            !isConfirmed ||
                                                            deleteServer.isPending
                                                        }
                                                        onClick={async () => {
                                                            if (
                                                                !initial ||
                                                                !isConfirmed ||
                                                                !initial.client_uuid
                                                            )
                                                                return;
                                                            try {
                                                                await deleteServer.mutateAsync({
                                                                    clientUuid: initial.client_uuid,
                                                                    serverUuid: initial.uuid,
                                                                });
                                                                toast.success(
                                                                    `${initial.name} has been deleted.`,
                                                                );
                                                                if (allClient) {
                                                                    navigate("/servers");
                                                                } else {
                                                                    navigate(
                                                                        `/clients/${initial.client_uuid}`,
                                                                    );
                                                                }
                                                            } catch (err: unknown) {
                                                                const msg =
                                                                    (
                                                                        err as {
                                                                            message?: string;
                                                                        }
                                                                    )?.message ||
                                                                    "Failed to delete server. Please try again.";
                                                                toast.error(msg);
                                                            }
                                                        }}
                                                    >
                                                        {deleteServer.isPending
                                                            ? "Deleting…"
                                                            : "Delete server"}
                                                    </Form.Button>
                                                </div>
                                            </DialogContent>
                                        )}
                                    >
                                        Delete this server
                                    </Form.DeleteModal>
                                </div>
                                </Form.Root>
                            </Tab.Item>
                            {isInstalled && mode === "view" && (
                                <Tab.Item icon={BarChart3} title="Metrics">
                                    <div className="flex flex-col gap-6 p-4 bg-card border border-t-0 border-border/60 rounded-b-lg">
                                        {/* Ports and Processes */}
                                        <div className="flex flex-col gap-6">
                                            {/* Processes */}
                                            <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-sm">
                                                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                                    <Cpu
                                                        size={16}
                                                        className="text-primary"
                                                    />{" "}
                                                    Top Processes
                                                </h3>
                                                {server?.processes &&
                                                server.processes.length > 0 ? (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left text-xs">
                                                            <thead>
                                                                <tr className="text-muted-foreground border-b border-border/30">
                                                                    <th className="pb-2 font-medium">
                                                                        PID
                                                                    </th>
                                                                    <th className="pb-2 font-medium">
                                                                        Name
                                                                    </th>
                                                                    <th className="pb-2 font-medium text-right">
                                                                        CPU
                                                                    </th>
                                                                    <th className="pb-2 font-medium text-right">
                                                                        RAM
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border/20">
                                                                {server.processes.map(
                                                                    (p) => (
                                                                        <tr
                                                                            key={
                                                                                p.pid
                                                                            }
                                                                            className="hover:bg-muted/10"
                                                                        >
                                                                            <td className="py-2 text-muted-foreground">
                                                                                {
                                                                                    p.pid
                                                                                }
                                                                            </td>
                                                                            <td
                                                                                className="py-2 font-medium text-foreground max-w-30 truncate"
                                                                                title={
                                                                                    p.name
                                                                                }
                                                                            >
                                                                                {
                                                                                    p.name
                                                                                }
                                                                            </td>
                                                                            <td className="py-2 text-right text-foreground">
                                                                                {p.cpu !=
                                                                                null
                                                                                    ? `${p.cpu.toFixed(1)}%`
                                                                                    : "-"}
                                                                            </td>
                                                                            <td className="py-2 text-right text-foreground">
                                                                                {p.memory !=
                                                                                null
                                                                                    ? `${p.memory.toFixed(1)} MB`
                                                                                    : "-"}
                                                                            </td>
                                                                        </tr>
                                                                    ),
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground py-4 text-center">
                                                        No processes reported.
                                                    </p>
                                                )}
                                            </div>

                                            {/* Open Ports */}
                                            <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-sm">
                                                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                                    <Link2
                                                        size={16}
                                                        className="text-primary"
                                                    />{" "}
                                                    Exposed Ports
                                                </h3>
                                                {server?.ports &&
                                                server.ports.length > 0 ? (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left text-xs">
                                                            <thead>
                                                                <tr className="text-muted-foreground border-b border-border/30">
                                                                    <th className="pb-2 font-medium">
                                                                        Port
                                                                    </th>
                                                                    <th className="pb-2 font-medium">
                                                                        Proto
                                                                    </th>
                                                                    <th className="pb-2 font-medium">
                                                                        Process
                                                                    </th>
                                                                    <th className="pb-2 font-medium text-right">
                                                                        State
                                                                    </th>
                                                                    <th className="pb-2 font-medium text-right">
                                                                        Ping
                                                                    </th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border/20">
                                                                {server.ports.map(
                                                                    (
                                                                        p,
                                                                        idx,
                                                                    ) => (
                                                                        <tr
                                                                            key={
                                                                                idx
                                                                            }
                                                                            className="hover:bg-muted/10"
                                                                        >
                                                                            <td className="py-2 font-semibold text-foreground">
                                                                                {
                                                                                    p.port
                                                                                }
                                                                            </td>
                                                                            <td className="py-2 text-muted-foreground uppercase">
                                                                                {
                                                                                    p.protocol
                                                                                }
                                                                            </td>
                                                                            <td className="py-2 text-foreground font-medium">
                                                                                {p.process ||
                                                                                    "unknown"}
                                                                            </td>
                                                                            <td className="py-2 text-right flex items-center justify-end gap-1.5">
                                                                                <span
                                                                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                                                                        p.state ===
                                                                                        "listening"
                                                                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                                                            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                                                                                    }`}
                                                                                >
                                                                                    {
                                                                                        p.state
                                                                                    }
                                                                                </span>
                                                                                {p.id && (
                                                                                    <button
                                                                                        onClick={() =>
                                                                                            handleDeletePort(
                                                                                                p.id,
                                                                                            )
                                                                                        }
                                                                                        className="p-1 rounded text-red-500/80 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                                                        title="Delete tracked port"
                                                                                    >
                                                                                        <Trash2
                                                                                            size={
                                                                                                12
                                                                                            }
                                                                                        />
                                                                                    </button>
                                                                                )}
                                                                            </td>
                                                                            <td className="py-2 text-right text-foreground">
                                                                                {p.ping_status ===
                                                                                "offline"
                                                                                    ? "offline"
                                                                                    : p.ping_status ===
                                                                                        "online"
                                                                                      ? `${p.ping_time}ms`
                                                                                      : "-"}
                                                                            </td>
                                                                        </tr>
                                                                    ),
                                                                )}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground py-4 text-center">
                                                        No open exposed ports.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-border/60">
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-sm font-semibold text-foreground">
                                                    System Resources
                                                </h3>
                                                <div className="flex items-center gap-2">
                                                    <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border border-border/50">
                                                        {(["1H", "1D", "1W", "1M", "3M", "6M"] as TimeSpan[]).map((span) => (
                                                            <button
                                                                key={span}
                                                                onClick={() => setTimeSpan(span)}
                                                                className={cn(
                                                                    "px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer",
                                                                    timeSpan === span
                                                                        ? "bg-background text-foreground shadow-sm border border-border"
                                                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                                )}
                                                            >
                                                                {span}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-md border border-border/50">
                                                        {(["1Y", "3Y", "6Y", "9Y", "12Y", "Custom"] as TimeSpan[]).map((span) => (
                                                            <button
                                                                key={span}
                                                                onClick={() => setTimeSpan(span)}
                                                                className={cn(
                                                                    "px-3 py-1 text-xs font-medium rounded transition-colors cursor-pointer",
                                                                    timeSpan === span
                                                                        ? "bg-background text-foreground shadow-sm border border-border"
                                                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                                                )}
                                                            >
                                                                {span}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {timeSpan === "Custom" && (
                                                <div className="flex flex-wrap items-center gap-4 mb-6 bg-muted/20 p-3 rounded-lg border border-border/50">
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-xs text-muted-foreground font-medium">From:</label>
                                                        <input
                                                            type="datetime-local"
                                                            value={customFrom}
                                                            onChange={(e) => setCustomFrom(e.target.value)}
                                                            className="bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 dark:[&::-webkit-calendar-picker-indicator]:invert"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-xs text-muted-foreground font-medium">Until:</label>
                                                        <input
                                                            type="datetime-local"
                                                            value={customTo}
                                                            onChange={(e) => setCustomTo(e.target.value)}
                                                            className="bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 dark:[&::-webkit-calendar-picker-indicator]:invert"
                                                        />
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <label className="text-xs text-muted-foreground font-medium">Unit:</label>
                                                        <select
                                                            value={customUnitStr}
                                                            onChange={(e) => setCustomUnitStr(e.target.value)}
                                                            className="bg-background border border-border rounded-md px-2 py-1 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                                                        >
                                                            <option value="auto">Auto</option>
                                                            <option value="1" disabled={(timeSpanArgs as any)?.minUnit > 1}>Minute</option>
                                                            <option value="2" disabled={(timeSpanArgs as any)?.minUnit > 2}>Hour</option>
                                                            <option value="3" disabled={(timeSpanArgs as any)?.minUnit > 3}>Day</option>
                                                            <option value="4" disabled={(timeSpanArgs as any)?.minUnit > 4}>Week</option>
                                                            <option value="5" disabled={(timeSpanArgs as any)?.minUnit > 5}>Month</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="grid grid-cols-1 gap-6">
                                                {CHARTS.map((cfg) => (
                                                    <ServerStatChart
                                                        key={cfg.dataKey}
                                                        title={cfg.title}
                                                        data={server?.stats || []}
                                                        dataKey={cfg.dataKey}
                                                        color={cfg.color}
                                                        unit={cfg.unit}
                                                        yDomain={cfg.yDomain}
                                                        timeSpan={timeSpan}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </Tab.Item>
                            )}

                            {mode === "view" && (
                                <Tab.Item icon={Bell} title="Alerts">
                                    <div className="bg-card border border-border/60 shadow-sm p-6 sm:p-8 flex flex-col gap-6">
                                        <div>
                                            <label className="text-sm font-medium text-foreground">
                                                Alert Scope
                                            </label>
                                            <p className="text-xs text-muted-foreground mb-3">
                                                Choose which alert configuration
                                                applies to this server.
                                            </p>
                                            <div className="flex gap-4">
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="alertScope"
                                                        value="global"
                                                        checked={
                                                            serverAlertTab.alertScope ===
                                                            "global"
                                                        }
                                                        onChange={() =>
                                                            serverAlertTab.setAlertScope(
                                                                "global",
                                                            )
                                                        }
                                                        className="accent-primary"
                                                    />
                                                    <span className="text-sm">
                                                        Global
                                                    </span>
                                                </label>
                                                {serverAlertTab.clientUuid && (
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="radio"
                                                            name="alertScope"
                                                            value="client"
                                                            checked={
                                                                serverAlertTab.alertScope ===
                                                                "client"
                                                            }
                                                            onChange={() =>
                                                                serverAlertTab.setAlertScope(
                                                                    "client",
                                                                )
                                                            }
                                                            className="accent-primary"
                                                        />
                                                        <span className="text-sm">
                                                            Client
                                                        </span>
                                                    </label>
                                                )}
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input
                                                        type="radio"
                                                        name="alertScope"
                                                        value="server"
                                                        checked={
                                                            serverAlertTab.alertScope ===
                                                            "server"
                                                        }
                                                        onChange={() =>
                                                            serverAlertTab.setAlertScope(
                                                                "server",
                                                            )
                                                        }
                                                        className="accent-primary"
                                                    />
                                                    <span className="text-sm">
                                                        Server
                                                    </span>
                                                </label>
                                            </div>
                                        </div>
                                        <NodeConfigEditor
                                            configKey={serverAlertTab.configKey}
                                            scopeLabel={
                                                serverAlertTab.alertScope ===
                                                "server"
                                                    ? (initial?.name ?? "")
                                                    : serverAlertTab.alertScope ===
                                                        "client"
                                                      ? (initial?.client_name ??
                                                        "")
                                                      : ""
                                            }
                                            showControls={false}
                                            showMinimap={false}
                                            showNodeTypesSidebar={false}
                                        />
                                    </div>
                                </Tab.Item>
                            )}

                            {mode === "view" && (
                                <Tab.Item icon={Cpu} title="Agent">
                                    <div className="flex flex-col gap-6 p-5 bg-card border border-t-0 border-border/60 rounded-b-lg min-h-75">
                                        <div className="flex items-center justify-between border-b border-border/30 pb-3">
                                            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                <Cpu
                                                    size={16}
                                                    className="text-primary"
                                                />{" "}
                                                Installed Agent Properties
                                            </h3>
                                            {server?.agent && (
                                                <span
                                                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${
                                                        server.agent.status ===
                                                        "online"
                                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                                            : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                                                    }`}
                                                >
                                                    {server.agent.status}
                                                </span>
                                            )}
                                        </div>

                                        {server?.agent ? (
                                            <>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {[
                                                        {
                                                            label: "Agent Version",
                                                            value: server.agent
                                                                .version,
                                                        },
                                                        {
                                                            label: "Heartbeat Interval",
                                                            value: `${server.agent.heartbeat_interval} seconds`,
                                                        },
                                                        {
                                                            label: "Metrics Scan Interval",
                                                            value: `${server.agent.metrics_interval} seconds`,
                                                        },
                                                        {
                                                            label: "Port Scan Interval",
                                                            value: `${server.agent.port_scan_interval} seconds`,
                                                        },
                                                        {
                                                            label: "Service Scan Interval",
                                                            value: `${server.agent.service_scan_interval} seconds`,
                                                        },
                                                        {
                                                            label: "Process Scan Interval",
                                                            value: `${server.agent.process_scan_interval} seconds`,
                                                        },
                                                        {
                                                            label: "Update Channel",
                                                            value: server.agent
                                                                .update_channel,
                                                            capitalize: true,
                                                        },
                                                        {
                                                            label: "Auto Update Enabled",
                                                            value: server.agent
                                                                .auto_update
                                                                ? "Yes"
                                                                : "No",
                                                        },
                                                        {
                                                            label: "First Registered",
                                                            value: new Date(
                                                                server.agent
                                                                    .registered_at,
                                                            ).toLocaleString(),
                                                        },
                                                        {
                                                            label: "Last Heartbeat",
                                                            value: server.agent
                                                                .last_seen_at
                                                                ? new Date(
                                                                      server
                                                                          .agent
                                                                          .last_seen_at,
                                                                  ).toLocaleString()
                                                                : "Never",
                                                        },
                                                    ].map((prop, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/40 hover:bg-muted/5 transition-colors"
                                                        >
                                                            <span className="text-xs font-medium text-muted-foreground">
                                                                {prop.label}
                                                            </span>
                                                            <span
                                                                className={`text-xs font-semibold text-foreground ${prop.capitalize ? "capitalize" : ""}`}
                                                            >
                                                                {prop.value}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="border-t border-border/30 pt-5 mt-3">
                                                    <h4 className="text-xs font-semibold text-foreground flex items-center gap-2 mb-3">
                                                        <Terminal
                                                            size={14}
                                                            className="text-primary"
                                                        />{" "}
                                                        Agent Activity History
                                                    </h4>
                                                    {server?.activities &&
                                                    server.activities.length >
                                                        0 ? (
                                                        <div className="flex flex-col gap-2 max-h-62.5 overflow-y-auto pr-1">
                                                            {server.activities.map(
                                                                (
                                                                    act,
                                                                    idx: number,
                                                                ) => (
                                                                    <div
                                                                        key={
                                                                            idx
                                                                        }
                                                                        className="flex items-start gap-3 p-2.5 rounded-lg bg-card border border-border/30 hover:bg-muted/5 transition-colors"
                                                                    >
                                                                        <div
                                                                            className={cn(
                                                                                "w-2 h-2 rounded-full mt-1.5 shrink-0",
                                                                                act.type ===
                                                                                    "agent_uninstalled"
                                                                                    ? "bg-red-500"
                                                                                    : act.type ===
                                                                                        "agent_updated"
                                                                                      ? "bg-blue-500"
                                                                                      : act.type ===
                                                                                          "server_online"
                                                                                        ? "bg-emerald-500"
                                                                                        : act.type ===
                                                                                            "registration_completed"
                                                                                          ? "bg-purple-500"
                                                                                          : "bg-primary",
                                                                            )}
                                                                        />
                                                                        <div className="flex-1 min-w-0">
                                                                            <p className="text-[11px] font-semibold text-foreground capitalize">
                                                                                {act.type.replace(
                                                                                    /_/g,
                                                                                    " ",
                                                                                )}
                                                                            </p>
                                                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                                {
                                                                                    act.description
                                                                                }
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                ),
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground py-2 text-center">
                                                            No agent activities
                                                            logged yet.
                                                        </p>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                                <Cpu
                                                    className="text-muted-foreground/30 mb-3"
                                                    size={32}
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    No agent registered on this
                                                    server yet.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </Tab.Item>
                            )}
                        </Tab>
                    </div>
                </main>
            </PageLayout>
        </ChartZoomProvider>
    );
}
