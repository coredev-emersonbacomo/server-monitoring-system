import { memo } from "react";
import {
    CheckCircle2,
    XCircle,
    AlertCircle,
    Wifi,
    WifiOff,
    AlertTriangle,
} from "lucide-react";
import type { Server } from "../data/mockDashboard";
import { ServerStatChart } from "./ServerStatChart";

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

const PORT_CONFIG = {
    open: { label: "Open", icon: CheckCircle2, color: "text-emerald-400" },
    closed: { label: "Closed", icon: XCircle, color: "text-red-400" },
    filtered: { label: "Filtered", icon: AlertCircle, color: "text-amber-400" },
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
    server: Server;
}

export const ServerCard = memo(function ServerCard({ server }: ServerCardProps) {
    const { icon: StatusIcon, label, color, bg } = STATUS_CONFIG[server.status];

    return (
        <div className="py-5 px-5">
            {/* Server header */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-foreground text-sm">
                        {server.name}
                    </span>
                    <span className="text-muted-foreground text-xs font-mono">
                        {server.ip}
                    </span>
                </div>

                <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${bg} ${color}`}
                >
                    <StatusIcon size={11} />
                    {label}
                </span>

                <div className="flex items-center gap-3 text-xs text-muted-foreground ml-auto">
                    <span title="Uptime">↑ {server.uptime}</span>
                    <span>
                        {server.cpuCores}-core · {server.ramGb} GB
                    </span>
                    <span>{server.os}</span>
                </div>
            </div>

            {/* Charts grid */}
            <div className="grid grid-cols-2 xl:grid-cols-5 lg:grid-cols-3 gap-2 mb-4">
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

            {/* Open Ports */}
            {server.openPorts.length > 0 && (
                <div>
                    <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                        Open Ports
                    </p>
                    <div className="rounded-lg border border-border/50 divide-y divide-border/40 overflow-hidden">
                        {server.openPorts.map((p) => {
                            const {
                                icon: PortIcon,
                                label: portLabel,
                                color: portColor,
                            } = PORT_CONFIG[p.status];
                            return (
                                <div
                                    key={`${p.port}-${p.protocol}`}
                                    className="flex items-center px-3 py-2 gap-4 text-sm hover:bg-muted/30 transition-colors"
                                >
                                    <span className="font-medium text-foreground/90 min-w-[100px]">
                                        {p.name}
                                    </span>
                                    <span className="font-mono text-muted-foreground text-xs">
                                        {p.port}/{p.protocol}
                                    </span>
                                    <span
                                        className={`inline-flex items-center gap-1.5 ml-auto ${portColor} text-xs font-medium`}
                                    >
                                        <PortIcon size={13} />
                                        {portLabel}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
});
