import {
    Wifi,
    WifiOff,
    AlertTriangle,
    Trash2,
    type LucideIcon,
} from "lucide-react";

export const STATUS_CONFIG = {
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
        color: "text-slate-400",
        bg: "bg-slate-500/10 border-slate-500/20",
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
    agent_uninstalled: {
        label: "Agent Uninstalled",
        icon: WifiOff,
        color: "text-red-400",
        bg: "bg-red-500/10 border-red-500/20",
    },
    pending_deletion: {
        label: "Pending Deletion",
        icon: Trash2,
        color: "text-orange-400",
        bg: "bg-orange-500/10 border-orange-500/20",
    },
} as const satisfies Record<
    string,
    { label: string; icon: LucideIcon; color: string; bg: string }
>;

export type ServerStatusKey = keyof typeof STATUS_CONFIG;

export function resolveServerStatusKey(
    status?: string | null,
    recordStatus?: string | null,
    agentDeleted?: boolean | null,
): ServerStatusKey {
    if (recordStatus === "archived" || status === "archived") return "archived";
    if (status === "agent_uninstalled") return "agent_uninstalled";
    if (agentDeleted) return "pending_deletion";
    return (status as ServerStatusKey) in STATUS_CONFIG
        ? (status as ServerStatusKey)
        : "pending_installation";
}