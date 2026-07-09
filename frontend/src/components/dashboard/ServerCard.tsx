import { memo, useState } from "react";
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
    Server,
    Network,
    Terminal,
    Copy,
    Check,
    RefreshCw,
} from "lucide-react";
import { Tab } from "@/components/ui/tab";
import { ServerStatChart } from "./ServerStatChart";
import type { ServerData } from "@/types/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface ServerCardProps {
    server: ServerData;
    onDelete?: (uuid: string) => Promise<void> | void;
}

export const ServerCard = memo(function ServerCard({
    server,
}: ServerCardProps) {
    const status =
        (server.status as keyof typeof STATUS_CONFIG) || "pending_installation";
    const { icon: StatusIcon, label, color, bg } = STATUS_CONFIG[status];

    const queryClient = useQueryClient();

    const [showDelete, setShowDelete] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const deleteServer = useDeleteServer();

    const [provisionDetails, setProvisionDetails] = useState<{
        linux_command?: string;
        windows_command?: string;
        expires_at?: string;
    } | null>(null);
    const [generating, setGenerating] = useState(false);
    const [copiedKey, setCopiedKey] = useState<"linux" | "windows" | null>(
        null,
    );

    const isConfirmed = confirmText.trim() === server.server_name;

    const generateProvisionToken = async () => {
        setGenerating(true);
        try {
            const { data, error } = await api.POST(
                "/v1/servers/{uuid}/provision",
                {
                    params: { path: { uuid: server.uuid } },
                },
            );
            if (error) {
                if (error.response?.status === 409 && error.response?.data) {
                    setProvisionDetails(
                        error.response.data as {
                            linux_command?: string;
                            windows_command?: string;
                            expires_at?: string;
                        },
                    );
                } else {
                    toast.error("Failed to generate provision token.");
                }
            } else if (data) {
                setProvisionDetails(data);
                toast.success("Provision token generated successfully!");
                queryClient.invalidateQueries({
                    queryKey: ["server", server.uuid],
                });
            }
        } catch {
            toast.error("An error occurred.");
        } finally {
            setGenerating(false);
        }
    };

    const regenerateProvisionToken = async () => {
        setGenerating(true);
        try {
            const { data, error } = await api.POST(
                "/v1/servers/{uuid}/provision/regenerate",
                {
                    params: { path: { uuid: server.uuid } },
                },
            );
            if (error) {
                toast.error("Failed to regenerate token.");
            } else if (data) {
                setProvisionDetails(data);
                toast.success("Provision token regenerated!");
                queryClient.invalidateQueries({
                    queryKey: ["server", server.uuid],
                });
            }
        } catch (e) {
            toast.error("An error occurred.");
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = (text: string, type: "linux" | "windows") => {
        navigator.clipboard.writeText(text);
        setCopiedKey(type);
        toast.success("Command copied to clipboard!");
        setTimeout(() => setCopiedKey(null), 2000);
    };

    const handleDelete = async () => {
        if (!isConfirmed || !server.client_uuid) return;
        try {
            await deleteServer.mutateAsync({
                clientUuid: server.client_uuid,
                serverUuid: server.uuid,
            });
            toast.success(`${server.server_name} has been deleted.`);
            setShowDelete(false);
        } catch {
            toast.error("Failed to delete server. Please try again.");
        }
    };

    const resetDialog = () => {
        setShowDelete(false);
        setConfirmText("");
    };

    const isInstalled =
        status === "online" || status === "warning" || status === "offline";

    return (
        <div className="py-5 px-5">
            {/* Server header */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
                <span
                    className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${bg} ${color}`}
                >
                    <StatusIcon size={14} />
                    {label}
                </span>

                <div className="flex items-center ml-auto">
                    {/* Delete button */}
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

            {/* Installation wizard if not installed */}
            {!isInstalled && (
                <div className="mb-6 p-5 rounded-xl border border-border bg-card/50 backdrop-blur-sm shadow-lg">
                    <div className="flex items-center gap-2.5 mb-4 text-foreground font-semibold">
                        <Terminal className="size-5 text-primary" />
                        <h2>Agent Installation Guide</h2>
                    </div>

                    {status === "pending_installation" && !provisionDetails && (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                To start monitoring this server, you must
                                install the lightweight monitoring agent on the
                                machine.
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
                                Run the appropriate command directly on your
                                server.
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
                                                {copiedKey === "linux" ? (
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
                                                {copiedKey === "windows" ? (
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
                                            </strong>
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={regenerateProvisionToken}
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

            {/* Tabs: Info / Metrics / Alerts */}
            <Tab syncUrl={false}>
                <Tab.Item icon={Info} title="Info">
                    <div className="grid grid-cols-1 sm:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3 p-4 bg-card border border-t-0 border-border/60 rounded-b-lg">
                        {[
                            {
                                icon: Server,
                                label: "Name",
                                value: server.server_name,
                            },
                            {
                                icon: Cpu,
                                label: "CPU",
                                value: server.cpu_model
                                    ? `${server.cpu_model} · ${server.cpu_cores ?? "?"} cores`
                                    : server.cpu_cores
                                      ? `${server.cpu_cores} cores`
                                      : "Waiting for Agent",
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
                        ].map(({ icon: ItemIcon, label, value }) => (
                            <div
                                key={label}
                                className="group flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border/60 shadow-sm hover:shadow-md hover:border-border transition-all"
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
                        ))}
                    </div>
                </Tab.Item>
                {isInstalled && (
                    <Tab.Item icon={BarChart3} title="Metrics">
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4 bg-card border border-t-0 border-border/60 rounded-b-lg">
                            {CHARTS.map((cfg) => (
                                <ServerStatChart
                                    key={cfg.dataKey}
                                    title={cfg.title}
                                    data={server.stats}
                                    dataKey={cfg.dataKey}
                                    color={cfg.color}
                                    unit={cfg.unit}
                                    yDomain={cfg.yDomain}
                                />
                            ))}
                        </div>
                    </Tab.Item>
                )}

                <Tab.Item icon={Bell} title="Alerts">
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground gap-2 bg-card border border-t-0 border-border/60 rounded-b-lg">
                        <Bell size={22} className="opacity-30" />
                        <p className="text-xs">No alerts for this server.</p>
                    </div>
                </Tab.Item>
            </Tab>

            {/* Delete confirmation dialog */}
            <Dialog
                open={showDelete}
                onOpenChange={(open) => !open && resetDialog()}
            >
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 size={16} />
                            Delete server
                        </DialogTitle>
                    </DialogHeader>

                    <p className="text-sm text-muted-foreground">
                        This will permanently stop monitoring{" "}
                        <strong className="text-foreground">
                            {server.server_name}
                        </strong>{" "}
                        and remove all collected metrics. This cannot be undone.
                    </p>

                    <div className="flex flex-col gap-2 pt-1">
                        <label className="text-xs text-muted-foreground">
                            Type{" "}
                            <strong className="text-foreground font-mono">
                                {server.server_name}
                            </strong>{" "}
                            to confirm
                        </label>
                        <Input
                            value={confirmText}
                            onChange={(e) => setConfirmText(e.target.value)}
                            placeholder={server.server_name}
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
                            disabled={!isConfirmed || deleteServer.isPending}
                            onClick={handleDelete}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
});
