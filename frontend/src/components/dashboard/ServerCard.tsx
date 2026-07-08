import { memo, useState } from "react";
import { Wifi, WifiOff, AlertTriangle, Trash2, Cpu, MemoryStick, HardDrive, Monitor, Info, BarChart3, Bell, Server, Network } from "lucide-react";
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
import type { components } from "@/api/schema.d";
import { useDeleteServer } from "@/hooks/useDeleteServer";

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
    const status = "online";
    const { icon: StatusIcon, label, color, bg } = STATUS_CONFIG[status];

    const [showDelete, setShowDelete] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const deleteServer = useDeleteServer();

    const isConfirmed = confirmText.trim() === server.server_name;

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
                                icon: Network,
                                label: "IP Address",
                                value: server.external_ip,
                            },
                            {
                                icon: Cpu,
                                label: "CPU",
                                value: server.cpu_model
                                    ? `${server.cpu_model} · ${server.cpu_cores ?? "?"} cores`
                                    : `${server.cpu_cores ?? "?"} cores`,
                            },
                            {
                                icon: MemoryStick,
                                label: "Memory",
                                value: `${server.ram ?? "?"} GB`,
                            },
                            {
                                icon: HardDrive,
                                label: "Disk",
                                value: `${server.disk ?? "?"} GB`,
                            },
                            {
                                icon: Monitor,
                                label: "OS",
                                value: server.operating_system ?? "Unknown",
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
                                    <span className="text-sm font-semibold text-foreground break-words">
                                        {value}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Tab.Item>
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
                        ({server.external_ip}) and remove all collected metrics.
                        This cannot be undone.
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
                            label={deleteServer.isPending ? "Deleting…" : "Delete server"}
                            disabled={!isConfirmed || deleteServer.isPending}
                            onClick={handleDelete}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}); 