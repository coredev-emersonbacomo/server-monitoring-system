import { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
    Pencil,
    X,
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
import type { StatPointData } from "@/types/models";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useDeleteServer } from "@/hooks/useDeleteServer";
import api from "@/api/api";
import { useQueryClient } from "@tanstack/react-query";

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

    const { data: initial, isLoading, isError } = useServer(uuid!);
    const [, setWsStatus] = useState<WsStatus>("connecting");
    const [history, setHistory] = useState<StatPointData[]>([]);

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
            const next = [...prev, live as unknown as StatPointData];
            return next.length > 144 ? next.slice(next.length - 144) : next;
        });
    }, [live]);

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

    const queryClient = useQueryClient();
    const [showDelete, setShowDelete] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const deleteServer = useDeleteServer();

    const [provisionDetails, setProvisionDetails] = useState<{
        linux_command: string;
        windows_command: string;
        expires_at: string;
    } | null>((initial?.activeProvisionDetails as any) ?? null);
    const [generating, setGenerating] = useState(false);
    const [copiedKey, setCopiedKey] = useState<
        "linux" | "windows" | "uninstall_linux" | "uninstall_windows" | null
    >(null);
    const [timeLeft, setTimeLeft] = useState<string>("");

    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [savingInfo, setSavingInfo] = useState(false);

    useEffect(() => {
        if (initial) {
            setEditName(initial.name);
            setEditDescription(initial.description ?? "");
        }
    }, [initial]);

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

    const isConfirmed = initial ? confirmText.trim() === initial.name : false;

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
                    setProvisionDetails(error as any);
                } else {
                    toast.error("Failed to generate provision token.");
                }
            } else if (data) {
                setProvisionDetails(data as any);
                toast.success("Provision token generated successfully!");
                queryClient.invalidateQueries({
                    queryKey: ["server", initial.uuid],
                });
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
                setProvisionDetails(data as any);
                toast.success("Provision token regenerated!");
                queryClient.invalidateQueries({
                    queryKey: ["server", initial.uuid],
                });
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

    const handleDelete = async () => {
        if (!initial || !isConfirmed || !initial.client_uuid) return;
        try {
            await deleteServer.mutateAsync({
                clientUuid: initial.client_uuid,
                serverUuid: initial.uuid,
            });
            toast.success(`${initial.name} has been deleted.`);
            setShowDelete(false);
            if (allClient) {
                navigate("/servers");
            } else {
                navigate(`/clients/${initial.client_uuid}`);
            }
        } catch (err: any) {
            const msg = err?.message || "Failed to delete server. Please try again.";
            toast.error(msg);
        }
    };

    const handleDeletePort = async (portId: number) => {
        if (!initial) return;
        if (!confirm("Are you sure you want to delete this tracked port?")) return;
        try {
            await api.DELETE("/v1/ports/{id}" as any, {
                params: { path: { id: portId } },
            } as any);
            toast.success("Tracked port deleted successfully!");
            queryClient.invalidateQueries({
                queryKey: ["server", initial.uuid],
            });
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
                queryClient.invalidateQueries({
                    queryKey: ["server", initial.uuid],
                });
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

                            <div className="flex items-center ml-auto">
                                <button
                                    onClick={() => setShowDelete(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600/90 hover:bg-red-600 text-white transition-colors cursor-pointer"
                                    title="Delete server"
                                >
                                    <Trash2 size={14} />
                                    Delete
                                </button>
                            </div>
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
                                                            `curl -fsSL ${window.location.origin}/install/linux | bash -s -- <token>`}
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
                                <div className="flex flex-col gap-1 p-4 pb-0 bg-card border border-t-0 border-b-0 border-border/60">
                                    {isEditingInfo ? (
                                        <div className="flex flex-col gap-3">
                                            <div>
                                                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                                                    Server name
                                                </label>
                                                <Input
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    className="text-sm"
                                                    autoFocus
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wider">
                                                    Description
                                                </label>
                                                <textarea
                                                    value={editDescription}
                                                    onChange={(e) =>
                                                        setEditDescription(e.target.value)
                                                    }
                                                    rows={2}
                                                    maxLength={255}
                                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                                                />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    label={savingInfo ? "Saving…" : "Save"}
                                                    onClick={saveInfo}
                                                    disabled={savingInfo}
                                                />
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    icon={<X size={13} />}
                                                    label="Cancel"
                                                    onClick={cancelEditInfo}
                                                    disabled={savingInfo}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="text-2xl font-semibold text-foreground">
                                                    {server.name}
                                                </h3>
                                                {server.description && (
                                                    <p className="text-sm text-muted-foreground">
                                                        {server.description}
                                                    </p>
                                                )}
                                            </div>
                                            <button
                                                onClick={startEditInfo}
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-border bg-transparent hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0 cursor-pointer"
                                                title="Edit name and description"
                                            >
                                                <Pencil size={13} />
                                                Edit
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-card border border-t-0 border-border/60 rounded-b-lg">
                                    {[
                                        {
                                            icon: Cpu,
                                            label: "CPU Model",
                                            value: server.cpu_model ?? "Unknown",
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
                                        ({ icon: ItemIcon, label, value, span }) => (
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
                            </Tab.Item>
                            {isInstalled && (
                                <Tab.Item icon={BarChart3} title="Metrics">
                                    <div className="flex flex-col gap-6 p-4 bg-card border border-t-0 border-border/60 rounded-b-lg">
                                        {/* Ports and Processes */}
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                            {/* Processes */}
                                            <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-sm">
                                                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                                    <Cpu size={16} className="text-primary" /> Top Processes
                                                </h3>
                                                {server?.processes && server.processes.length > 0 ? (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left text-xs">
                                                            <thead>
                                                                <tr className="text-muted-foreground border-b border-border/30">
                                                                    <th className="pb-2 font-medium">PID</th>
                                                                    <th className="pb-2 font-medium">Name</th>
                                                                    <th className="pb-2 font-medium text-right">CPU</th>
                                                                    <th className="pb-2 font-medium text-right">RAM</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border/20">
                                                                {server.processes.map((p) => (
                                                                    <tr key={p.pid} className="hover:bg-muted/10">
                                                                        <td className="py-2 text-muted-foreground">{p.pid}</td>
                                                                        <td className="py-2 font-medium text-foreground max-w-[120px] truncate" title={p.name}>{p.name}</td>
                                                                        <td className="py-2 text-right text-foreground">{p.cpu !== null ? `${p.cpu.toFixed(1)}%` : "-"}</td>
                                                                        <td className="py-2 text-right text-foreground">{p.memory !== null ? `${p.memory.toFixed(1)} MB` : "-"}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground py-4 text-center">No processes reported.</p>
                                                )}
                                            </div>

                                            {/* Open Ports */}
                                            <div className="bg-card/50 border border-border/50 rounded-xl p-4 shadow-sm">
                                                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                                    <Link2 size={16} className="text-primary" /> Exposed Ports
                                                </h3>
                                                {server?.ports && server.ports.length > 0 ? (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-left text-xs">
                                                            <thead>
                                                                <tr className="text-muted-foreground border-b border-border/30">
                                                                    <th className="pb-2 font-medium">Port</th>
                                                                    <th className="pb-2 font-medium">Proto</th>
                                                                    <th className="pb-2 font-medium">Process</th>
                                                                    <th className="pb-2 font-medium text-right">State</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-border/20">
                                                                {server.ports.map((p, idx) => (
                                                                    <tr key={idx} className="hover:bg-muted/10">
                                                                        <td className="py-2 font-semibold text-foreground">{p.port}</td>
                                                                        <td className="py-2 text-muted-foreground uppercase">{p.protocol}</td>
                                                                        <td className="py-2 text-foreground font-medium">{p.process || "unknown"}</td>
                                                                        <td className="py-2 text-right flex items-center justify-end gap-1.5">
                                                                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                                                                p.state === 'listening' 
                                                                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                                                                    : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                                                                            }`}>
                                                                                {p.state}
                                                                            </span>
                                                                            {p.id && (
                                                                                <button
                                                                                    onClick={() => handleDeletePort(p.id)}
                                                                                    className="p-1 rounded text-red-500/80 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                                                                                    title="Delete tracked port"
                                                                                >
                                                                                    <Trash2 size={12} />
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground py-4 text-center">No open exposed ports.</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 gap-6 pt-6 border-t border-border/60">
                                            {CHARTS.map((cfg) => (
                                                <ServerStatChart
                                                    key={cfg.dataKey}
                                                    title={cfg.title}
                                                    data={server?.stats || []}
                                                    dataKey={cfg.dataKey}
                                                    color={cfg.color}
                                                    unit={cfg.unit}
                                                    yDomain={cfg.yDomain}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </Tab.Item>
                            )}

                            <Tab.Item icon={Bell} title="Alerts">
                                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2 bg-card border border-t-0 border-border/60 rounded-b-lg">
                                    <Bell size={22} className="opacity-30" />
                                    <p className="text-xs">
                                        No alerts for this server.
                                    </p>
                                </div>
                            </Tab.Item>
                        </Tab>

                        {(() => {
                            const serverData = initial as any;
                            return (
                                <Dialog
                                    open={showDelete}
                                    onOpenChange={(open) => !open && resetDialog()}
                                >
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
                                            and remove all collected metrics. This
                                            cannot be undone.
                                        </p>

                                        {serverData && !serverData.agent_deleted && (
                                            <div className="flex flex-col gap-3 p-3.5 bg-destructive/5 border border-destructive/20 rounded-lg text-xs text-destructive">
                                                <div className="flex items-start gap-2">
                                                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                                                    <div>
                                                        <p className="font-semibold text-foreground">Agent Uninstallation Required</p>
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
                                                                {serverData.uninstall_linux_command}
                                                            </span>
                                                            <button
                                                                onClick={() =>
                                                                    copyToClipboard(
                                                                        serverData.uninstall_linux_command!,
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
                                                                {serverData.uninstall_windows_command}
                                                            </span>
                                                            <button
                                                                onClick={() =>
                                                                    copyToClipboard(
                                                                        serverData.uninstall_windows_command!,
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
                                    <DialogClose asChild>
                                        <Button
                                            variant="outline"
                                            label="Cancel"
                                            onClick={resetDialog}
                                        />
                                    </DialogClose>
                                    <Button
                                        variant="danger"
                                        label={
                                            deleteServer.isPending
                                                ? "Deleting…"
                                                : "Delete server"
                                        }
                                        disabled={
                                            !isConfirmed ||
                                            deleteServer.isPending
                                        }
                                        onClick={handleDelete}
                                    />
                                </div>
                            </DialogContent>
                        </Dialog>
                            );
                        })()}
                    </div>
                </main>
            </PageLayout>
        </ChartZoomProvider>
    );
}
