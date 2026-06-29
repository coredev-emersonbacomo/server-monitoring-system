import { memo } from "react";
import {
    Wifi,
    WifiOff,
    AlertTriangle,
} from "lucide-react";
import { ServerStatChart } from "./ServerStatChart";
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
}

export const ServerCard = memo(function ServerCard({
    server,
}: ServerCardProps) {
    const status = "online";
    const { icon: StatusIcon, label, color, bg } = STATUS_CONFIG[status];

    return (
        <div className="py-5 px-5">
            {/* Server header */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="font-semibold text-foreground text-sm">
                        {server.server_name}
                    </span>
                    <span className="text-muted-foreground text-xs font-mono">
                        {server.internal_ip}
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
        </div>
    );
});
