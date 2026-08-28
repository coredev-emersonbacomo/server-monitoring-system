import {
    Server,
    Wifi,
    WifiOff,
    AlertTriangle,
    Trash2,
} from "lucide-react";

export const STATUS_META: Record<
    string,
    { icon: typeof Server; color: string; bg: string }
> = {
    online: { icon: Wifi, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    warning: {
        icon: AlertTriangle,
        color: "text-amber-400",
        bg: "bg-amber-500/10",
    },
    offline: { icon: WifiOff, color: "text-red-400", bg: "bg-red-500/10" },
    pending_installation: {
        icon: AlertTriangle,
        color: "text-slate-400",
        bg: "bg-slate-500/10",
    },
    waiting_for_installation: {
        icon: AlertTriangle,
        color: "text-amber-400",
        bg: "bg-amber-500/10",
    },
    waiting_for_first_heartbeat: {
        icon: WifiOff,
        color: "text-blue-400",
        bg: "bg-blue-500/10",
    },
    archived: { icon: Trash2, color: "text-slate-400", bg: "bg-slate-500/10" },
    pending_deletion: { icon: Trash2, color: "text-orange-400", bg: "bg-orange-500/10" },
    agent_uninstalled: {
        icon: WifiOff,
        color: "text-red-400",
        bg: "bg-red-500/10",
    },
};
