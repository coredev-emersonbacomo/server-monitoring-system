import { Link } from "react-router-dom";
import {
    Monitor,
    Globe,
    Cpu,
    MemoryStick,
    Wifi,
    WifiOff,
    AlertTriangle,
    Trash2,
} from "lucide-react";
import type { ServerData } from "@/types/models";

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
        color: "text-amber-400",
        bg: "bg-amber-500/10 border-amber-500/20",
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
    pending_deletion: {
        label: "Pending Deletion",
        icon: Trash2,
        color: "text-orange-400",
        bg: "bg-orange-500/10 border-orange-500/20",
    },
} as const;

type StatusKey = keyof typeof STATUS_CONFIG;

export default function ServerCard({ server }: { server: ServerData }) {
    const isArchived = server.record_status === "archived" || server.status === "archived";
    const statusKey: StatusKey = isArchived
        ? "archived"
        : server.agent_deleted
        ? "pending_deletion"
        : (server.status as StatusKey) in STATUS_CONFIG
          ? (server.status as StatusKey)
          : "pending_installation";
    const { label, icon: StatusIcon, color, bg } = STATUS_CONFIG[statusKey];

    return (
        <Link
            to={`/servers/${server.uuid}`}
            className="bg-card border border-border/60 rounded-xl shadow-sm p-5 flex flex-col gap-3 transition-shadow hover:shadow-md group"
        >
            <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Monitor className="w-5 h-5 text-primary" />
                </div>
                <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${bg} ${color}`}
                >
                    <StatusIcon size={10} />
                    {label}
                </span>
            </div>

            <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {server.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {server.host_name}
                </p>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {server.operating_system && (
                    <span className="flex items-center gap-1">
                        <Globe size={11} />
                        {server.operating_system}
                    </span>
                )}
            </div>

            {(server.cpu_cores || server.ram) && (
                <div className="flex gap-3 text-xs text-muted-foreground pt-1 border-t border-border/40">
                    {server.cpu_cores && (
                        <span className="flex items-center gap-1">
                            <Cpu size={11} />
                            {server.cpu_cores} cores
                        </span>
                    )}
                    {server.ram && (
                        <span className="flex items-center gap-1">
                            <MemoryStick size={11} />
                            {server.ram} GB
                        </span>
                    )}
                </div>
            )}
        </Link>
    );
}
