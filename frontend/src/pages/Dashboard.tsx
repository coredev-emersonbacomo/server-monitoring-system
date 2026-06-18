import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Server, Landmark, Wifi, WifiOff, AlertTriangle, Gauge } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { mockClients } from "../data/mockDashboard";

const STATUS_COLORS = {
    online: "#10b981",
    warning: "#f59e0b",
    offline: "#ef4444",
};

type MetricKey = "cpu" | "memory" | "disk";

const METRICS: { key: MetricKey; label: string; color: string }[] = [
    { key: "cpu", label: "CPU", color: "#8b5cf6" },
    { key: "memory", label: "Memory", color: "#10b981" },
    { key: "disk", label: "Disk", color: "#3b82f6" },
];

function usageColor(value: number): string {
    if (value >= 80) return "#ef4444";
    if (value >= 60) return "#f59e0b";
    return "#10b981";
}

export default function Dashboard() {
    const navigate = useNavigate();

    const stats = useMemo(() => {
        let totalServers = 0;
        let online = 0;
        let warning = 0;
        let offline = 0;

        for (const client of mockClients) {
            for (const server of client.servers) {
                totalServers++;
                if (server.status === "online") online++;
                else if (server.status === "warning") warning++;
                else offline++;
            }
        }

        return {
            totalClients: mockClients.length,
            totalServers,
            online,
            warning,
            offline,
        };
    }, []);

    const rankings = useMemo(() => {
        const allServers: { id: number; name: string; client: string; cpu: number; memory: number; disk: number }[] = [];

        for (const client of mockClients) {
            for (const server of client.servers) {
                const last = server.stats[server.stats.length - 1];
                allServers.push({
                    id: server.id,
                    name: server.name,
                    client: client.name,
                    cpu: last.cpu,
                    memory: last.memory,
                    disk: last.disk,
                });
            }
        }

        return {
            cpu: [...allServers].sort((a, b) => b.cpu - a.cpu).slice(0, 5),
            memory: [...allServers].sort((a, b) => b.memory - a.memory).slice(0, 5),
            disk: [...allServers].sort((a, b) => b.disk - a.disk).slice(0, 5),
        };
    }, []);

    const pieData = [
        { name: "Online", value: stats.online, color: STATUS_COLORS.online },
        { name: "Warning", value: stats.warning, color: STATUS_COLORS.warning },
        { name: "Offline", value: stats.offline, color: STATUS_COLORS.offline },
    ].filter((d) => d.value > 0);

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
            <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div className="px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Activity className="w-5 h-5 text-primary" />
                            </div>
                            <h1 className="text-lg font-semibold tracking-tight">
                                Dashboard
                            </h1>
                        </div>
                    </div>
                </div>
            </header>

            <main className="px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 min-h-0 overflow-auto">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                    <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-lg">
                            <Landmark className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold">{stats.totalClients}</p>
                            <p className="text-xs text-muted-foreground">Total Clients</p>
                        </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-lg">
                            <Server className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold">{stats.totalServers}</p>
                            <p className="text-xs text-muted-foreground">Total Servers</p>
                        </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3">
                        <div className="p-2.5 bg-emerald-500/10 rounded-lg">
                            <Wifi className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-emerald-400">{stats.online}</p>
                            <p className="text-xs text-muted-foreground">Online</p>
                        </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3">
                        <div className="p-2.5 bg-amber-500/10 rounded-lg">
                            <AlertTriangle className="w-5 h-5 text-amber-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-amber-400">{stats.warning}</p>
                            <p className="text-xs text-muted-foreground">Warning</p>
                        </div>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3">
                        <div className="p-2.5 bg-red-500/10 rounded-lg">
                            <WifiOff className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-semibold text-red-400">{stats.offline}</p>
                            <p className="text-xs text-muted-foreground">Offline</p>
                        </div>
                    </div>
                </div>

                {/* Donut Chart + Client List */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 rounded-xl border border-border/60 bg-card p-6">
                        <h2 className="text-sm font-semibold text-foreground mb-4">Server Status Overview</h2>
                        {pieData.length > 0 ? (
                            <div className="flex flex-col items-center">
                                <ResponsiveContainer width="100%" height={220}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={90}
                                            paddingAngle={3}
                                            dataKey="value"
                                            isAnimationActive={false}
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={index} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "oklch(0.205 0 0)",
                                                border: "1px solid rgba(255,255,255,0.1)",
                                                borderRadius: "8px",
                                                fontSize: "12px",
                                                padding: "6px 10px",
                                                color: "rgba(255,255,255,0.85)",
                                            }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap gap-4 mt-2 justify-center">
                                    {pieData.map((d) => (
                                        <div key={d.name} className="flex items-center gap-1.5 text-xs">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                            <span className="text-muted-foreground">{d.name}</span>
                                            <span className="font-medium text-foreground">{d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">No servers</p>
                        )}
                    </div>

                    <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card p-6">
                        <h2 className="text-sm font-semibold text-foreground mb-4">Clients</h2>
                        <div className="space-y-3">
                            {mockClients.map((client) => {
                                const onlineCount = client.servers.filter((s) => s.status === "online").length;
                                return (
                                    <div
                                        key={client.id}
                                        className="rounded-lg border border-border/40 p-4 hover:bg-muted/20 transition-colors cursor-pointer"
                                        onClick={() => navigate("/clients")}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className="w-1 h-8 rounded-full"
                                                    style={{ background: `linear-gradient(to bottom, ${client.gradient.from}, ${client.gradient.to})` }}
                                                />
                                                <div>
                                                    <p className="font-medium text-sm text-foreground">{client.name}</p>
                                                    <p className="text-xs text-muted-foreground">{client.region}</p>
                                                </div>
                                            </div>
                                            <div className="text-right text-xs text-muted-foreground">
                                                <p>{client.servers.length} servers</p>
                                                <p className="text-emerald-400">{onlineCount} online</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {client.servers.map((server) => (
                                                <span
                                                    key={server.id}
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity ${
                                                        server.status === "online"
                                                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                                            : server.status === "warning"
                                                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                                                    }`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        navigate(`/servers/${server.id}`);
                                                    }}
                                                >
                                                    {server.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Top Usage Rankings */}
                <div className="mt-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Gauge className="w-4 h-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold text-foreground">Top Usage Rankings</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {METRICS.map((metric) => {
                            const items = rankings[metric.key];
                            return (
                                <div key={metric.key} className="rounded-xl border border-border/60 bg-card p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: metric.color }} />
                                        <span className="text-xs font-semibold text-foreground uppercase tracking-wide">{metric.label}</span>
                                    </div>
                                    <div className="space-y-2.5">
                                        {items.length === 0 ? (
                                            <p className="text-xs text-muted-foreground">No data</p>
                                        ) : (
                                            items.map((item, idx) => {
                                                const value = item[metric.key];
                                                const barColor = usageColor(value);
                                                return (
                                                    <div
                                                        key={item.id}
                                                        className="group cursor-pointer"
                                                        onClick={() => navigate(`/servers/${item.id}`)}
                                                    >
                                                        <div className="flex items-center justify-between text-xs mb-1">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <span className="text-muted-foreground font-medium w-3.5 text-right">{idx + 1}</span>
                                                                <span className="font-medium text-foreground truncate">{item.name}</span>
                                                                <span className="text-muted-foreground truncate hidden sm:inline">{item.client}</span>
                                                            </div>
                                                            <span className="font-mono font-medium tabular-nums ml-2" style={{ color: barColor }}>
                                                                {value.toFixed(1)}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full transition-all"
                                                                style={{
                                                                    width: `${value}%`,
                                                                    backgroundColor: barColor,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </main>
        </div>
    );
}
