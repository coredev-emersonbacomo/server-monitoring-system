import { memo, useState } from "react";
import {
    Wifi,
    WifiOff,
    AlertTriangle,
    Trash2,
} from "lucide-react";
import { ServerStatChart } from "./ServerStatChart";
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

type ServerDetailData = components["schemas"]["ServerData"];

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
    server: ServerDetailData;
    onDelete?: (id: number) => Promise<void> | void;
}

export const ServerCard = memo(function ServerCard({
    server,
    onDelete,
}: ServerCardProps) {
    const status = "online";
    const { icon: StatusIcon, label, color, bg } = STATUS_CONFIG[status];

    const [showDelete, setShowDelete] = useState(false);
    const [confirmText, setConfirmText] = useState("");
    const [isDeleting, setIsDeleting] = useState(false);

    const isConfirmed = confirmText.trim() === server.server_name;

    const handleDelete = async () => {
        if (!isConfirmed || !onDelete || server.client_uuid == null) return;
        setIsDeleting(true);
        try {
            await onDelete(server.client_uuid); // now narrowed to number
            toast.success(`${server.server_name} has been deleted.`);
            setShowDelete(false);
        } catch {
            toast.error("Failed to delete server. Please try again.");
        } finally {
            setIsDeleting(false);
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
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-foreground text-sm">
                        {server.server_name}
                    </span>
                    <span className="text-muted-foreground text-xs font-mono">
                        {server.external_ip}
                    </span>
                </div>

                <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${bg} ${color}`}
                >
                    <StatusIcon size={11} />
                    {label}
                </span>

                <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto">
                    <span>
                        {server.cpu_cores ?? "?"}-core · {server.ram ?? "?"} GB
                    </span>
                    <span>{server.operating_system ?? "Unknown"}</span>

                    {/* Delete button */}
                    <button
                        onClick={() => setShowDelete(true)}
                        className="flex items-center gap-1 text-muted-foreground hover:text-destructive transition-colors pl-1"
                        title="Delete server"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
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

            {/* Delete confirmation dialog */}
            <Dialog open={showDelete} onOpenChange={(open) => !open && resetDialog()}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 size={16} />
                            Delete server
                        </DialogTitle>
                    </DialogHeader>

                    <p className="text-sm text-muted-foreground">
                        This will permanently stop monitoring{" "}
                        <strong className="text-foreground">{server.server_name}</strong>{" "}
                        ({server.internal_ip}) and remove all collected metrics. This cannot be undone.
                    </p>

                    <div className="flex flex-col gap-1.5 pt-1">
                        <label className="text-xs text-muted-foreground">
                            Type <strong className="text-foreground font-mono">{server.server_name}</strong> to confirm
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
                            <Button variant="outline" label="Cancel" onClick={resetDialog} />
                        </DialogClose>
                        <Button
                            variant="danger"
                            label={isDeleting ? "Deleting…" : "Delete server"}
                            disabled={!isConfirmed || isDeleting}
                            onClick={handleDelete}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}); 