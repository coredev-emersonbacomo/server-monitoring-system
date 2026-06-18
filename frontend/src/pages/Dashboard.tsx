import { useNavigate, Link } from "react-router-dom";
import {
    Activity,
    Server,
    Landmark,
    Wifi,
    WifiOff,
    AlertTriangle,
    Gauge,
    RefreshCw,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useDashboardStats } from "@/hooks/useDashboard";
import { useClients } from "@/hooks/useClients";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
    online: "#10b981",
    warning: "#f59e0b",
    offline: "#ef4444",
};

type MetricKey = "cpu" | "memory" | "disk";

const METRICS: {
    key: MetricKey;
    label: string;
    color: string;
    dataKey: string;
}[] = [
    { key: "cpu", label: "CPU", color: "#8b5cf6", dataKey: "top_usage_cpu" },
    {
        key: "memory",
        label: "Memory",
        color: "#10b981",
        dataKey: "top_usage_memory",
    },
    { key: "disk", label: "Disk", color: "#3b82f6", dataKey: "top_usage_disk" },
];

function usageColor(value: number): string {
    if (value >= 80) return "#ef4444";
    if (value >= 60) return "#f59e0b";
    return "#10b981";
}

// ─── Custom tooltip — uses CSS variables for dark-mode awareness ───────────────

interface CustomTooltipProps {
    active?: boolean;
    payload?: { name: string; value: string }[];
}

function ChartTooltip({ active, payload }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground shadow-md">
            <p className="font-medium">{payload[0].name}</p>
            <p className="text-muted-foreground">{payload[0].value} servers</p>
        </div>
    );
}

// ─── Skeleton components ──────────────────────────────────────────────────────

function StatCardSkeleton() {
    return (
        <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-lg bg-muted shrink-0" />
            <div className="flex flex-col gap-1.5">
                <div className="h-6 w-10 bg-muted rounded" />
                <div className="h-3 w-16 bg-muted rounded" />
            </div>
        </div>
    );
}

function PieChartSkeleton() {
    return (
        <div className="flex flex-col items-center animate-pulse">
            <div className="w-55 h-55 rounded-full border-30 border-muted bg-transparent" />
        </div>
    );
}

function ClientCardSkeleton() {
    return (
        <div className="rounded-lg border border-border/40 p-4 animate-pulse">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div className="w-1 h-8 rounded-full bg-muted" />
                    <div>
                        <div className="h-4 w-24 bg-muted rounded mb-1" />
                        <div className="h-3 w-16 bg-muted rounded" />
                    </div>
                </div>
                <div className="h-4 w-16 bg-muted rounded" />
            </div>
            <div className="flex gap-2 flex-wrap">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-5 w-16 bg-muted rounded" />
                ))}
            </div>
        </div>
    );
}

function RankingSkeleton() {
    return (
        <div className="rounded-xl border border-border/60 bg-card p-4 animate-pulse">
            <div className="h-4 w-12 bg-muted rounded mb-3" />
            <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i}>
                        <div className="flex justify-between mb-1">
                            <div className="h-3 w-28 bg-muted rounded" />
                            <div className="h-3 w-10 bg-muted rounded" />
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
    const navigate = useNavigate();

    const {
        data: stats,
        isLoading: statsLoading,
        isError: statsError,
        retry,
    } = useDashboardStats();
    const { data: clients, isLoading: clientsLoading } = useClients();

    const pieData = stats
        ? [
              {
                  name: "Online",
                  value: stats.online_count,
                  color: STATUS_COLORS.online,
              },
              {
                  name: "Warning",
                  value: stats.warning_count,
                  color: STATUS_COLORS.warning,
              },
              {
                  name: "Offline",
                  value: stats.offline_count,
                  color: STATUS_COLORS.offline,
              },
          ].filter((d) => d.value > 0)
        : [];

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

                        {/* Error retry in header */}
                        {statsError && (
                            <Button
                                variant="outline"
                                size="sm"
                                icon={<RefreshCw size={14} />}
                                label="Retry"
                                onClick={retry}
                            />
                        )}
                    </div>
                </div>
            </header>

            <main className="px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 min-h-0 overflow-auto">
                {/* ── Error banner ── */}
                {statsError && (
                    <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/10 p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-sm text-destructive">
                            <AlertTriangle size={16} />
                            <span>
                                Failed to load dashboard stats. Data may be
                                stale.
                            </span>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            icon={<RefreshCw size={14} />}
                            label="Retry"
                            onClick={retry}
                        />
                    </div>
                )}

                {/* ── Stats Grid ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
                    {statsLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <StatCardSkeleton key={i} />
                        ))
                    ) : (
                        <>
                            <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3">
                                <div className="p-2.5 bg-primary/10 rounded-lg">
                                    <Landmark className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-semibold">
                                        {stats?.total_clients ?? 0}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Total Clients
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3">
                                <div className="p-2.5 bg-primary/10 rounded-lg">
                                    <Server className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <p className="text-2xl font-semibold">
                                        {stats?.total_servers ?? 0}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Total Servers
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3">
                                <div className="p-2.5 bg-emerald-500/10 rounded-lg">
                                    <Wifi className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-semibold text-emerald-400">
                                        {stats?.online_count ?? 0}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Online
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3">
                                <div className="p-2.5 bg-amber-500/10 rounded-lg">
                                    <AlertTriangle className="w-5 h-5 text-amber-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-semibold text-amber-400">
                                        {stats?.warning_count ?? 0}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Warning
                                    </p>
                                </div>
                            </div>
                            <div className="rounded-xl border border-border/60 bg-card p-4 flex items-center gap-3">
                                <div className="p-2.5 bg-red-500/10 rounded-lg">
                                    <WifiOff className="w-5 h-5 text-red-400" />
                                </div>
                                <div>
                                    <p className="text-2xl font-semibold text-red-400">
                                        {stats?.offline_count ?? 0}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Offline
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* ── Donut Chart + Client List ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Pie chart */}
                    <div className="lg:col-span-1 rounded-xl border border-border/60 bg-card p-6">
                        <h2 className="text-sm font-semibold text-foreground mb-4">
                            Server Status Overview
                        </h2>
                        {statsLoading ? (
                            <PieChartSkeleton />
                        ) : pieData.length > 0 ? (
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
                                                <Cell
                                                    key={index}
                                                    fill={entry.color}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<ChartTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="flex flex-wrap gap-4 mt-2 justify-center">
                                    {pieData.map((d) => (
                                        <div
                                            key={d.name}
                                            className="flex items-center gap-1.5 text-xs"
                                        >
                                            <span
                                                className="w-2.5 h-2.5 rounded-full"
                                                style={{
                                                    backgroundColor: d.color,
                                                }}
                                            />
                                            <span className="text-muted-foreground">
                                                {d.name}
                                            </span>
                                            <span className="font-medium text-foreground">
                                                {d.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No servers
                            </p>
                        )}
                    </div>

                    {/* Clients list */}
                    <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card p-6">
                        <h2 className="text-sm font-semibold text-foreground mb-4">
                            Clients
                        </h2>
                        <div className="space-y-3">
                            {clientsLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <ClientCardSkeleton key={i} />
                                ))
                            ) : !clients?.length ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No clients yet.
                                </p>
                            ) : (
                                clients.map((client) => (
                                    <Link
                                        key={client.id}
                                        to={`/clients/${client.id}`}
                                        className="block rounded-lg border border-border/40 p-4 hover:bg-muted/20 transition-colors"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1 h-8 rounded-full bg-primary/60" />
                                                <div>
                                                    <p className="font-medium text-sm text-foreground">
                                                        {client.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {client.location}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right text-xs text-muted-foreground">
                                                <p>
                                                    {client.servers_count}{" "}
                                                    servers
                                                </p>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Top Usage Rankings ── */}
                <div className="mt-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Gauge className="w-4 h-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold text-foreground">
                            Top Usage Rankings
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {statsLoading
                            ? Array.from({ length: 3 }).map((_, i) => (
                                  <RankingSkeleton key={i} />
                              ))
                            : METRICS.map((metric) => {
                                  const items =
                                      metric.key === "cpu"
                                          ? stats?.top_usage_cpu
                                          : metric.key === "memory"
                                            ? stats?.top_usage_memory
                                            : stats?.top_usage_disk;

                                  return (
                                      <div
                                          key={metric.key}
                                          className="rounded-xl border border-border/60 bg-card p-4"
                                      >
                                          <div className="flex items-center gap-2 mb-3">
                                              <span
                                                  className="w-2 h-2 rounded-full"
                                                  style={{
                                                      backgroundColor:
                                                          metric.color,
                                                  }}
                                              />
                                              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                                                  {metric.label}
                                              </span>
                                          </div>
                                          <div className="space-y-2.5">
                                              {!items?.length ? (
                                                  <p className="text-xs text-muted-foreground">
                                                      No data
                                                  </p>
                                              ) : (
                                                  items.map((item, idx) => {
                                                      const barColor =
                                                          usageColor(
                                                              item.value,
                                                          );
                                                      return (
                                                          <div
                                                              key={
                                                                  item.server_id
                                                              }
                                                              className={cn(
                                                                  "group cursor-pointer",
                                                              )}
                                                              onClick={() =>
                                                                  navigate(
                                                                      `/servers/${item.server_id}`,
                                                                  )
                                                              }
                                                          >
                                                              <div className="flex items-center justify-between text-xs mb-1">
                                                                  <div className="flex items-center gap-1.5 min-w-0">
                                                                      <span className="text-muted-foreground font-medium w-3.5 text-right">
                                                                          {idx +
                                                                              1}
                                                                      </span>
                                                                      <span className="font-medium text-foreground truncate">
                                                                          {
                                                                              item.server_name
                                                                          }
                                                                      </span>
                                                                      <span className="text-muted-foreground truncate hidden sm:inline">
                                                                          {
                                                                              item.client_name
                                                                          }
                                                                      </span>
                                                                  </div>
                                                                  <span
                                                                      className="font-mono font-medium tabular-nums ml-2"
                                                                      style={{
                                                                          color: barColor,
                                                                      }}
                                                                  >
                                                                      {item.value.toFixed(
                                                                          1,
                                                                      )}
                                                                      %
                                                                  </span>
                                                              </div>
                                                              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                                                  <div
                                                                      className="h-full rounded-full transition-all"
                                                                      style={{
                                                                          width: `${item.value}%`,
                                                                          backgroundColor:
                                                                              barColor,
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
