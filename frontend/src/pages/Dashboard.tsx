import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Activity,
    Server,
    Landmark,
    AlertTriangle,
    Gauge,
    RefreshCw,
    ShieldX,
    TimerOff,
    UserX,
    CheckCircle2,
    Circle,
    UserPlus,
    CircleCheckBig,
    CircleEllipsis,
    ScrollText,
    X,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useDashboardStats } from "@/hooks/useDashboard";
import {
    useDashboardActions,
    useCompletedActions,
    useClaimAction,
    useUpdateActionStatus,
    type ActionItem,
} from "@/hooks/useDashboardActions";
import { useAuthContext } from "@/hooks/useAuthContext";
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

function PieChartSkeleton() {
    return (
        <div className="flex flex-col items-center animate-pulse">
            <div className="w-55 h-55 rounded-full border-30 border-muted bg-transparent" />
        </div>
    );
}

function ActionCardSkeleton() {
    return (
        <div className="flex items-center gap-3 p-4 rounded-lg animate-pulse">
            <div className="w-10 h-10 rounded-lg bg-muted shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-muted rounded" />
                <div className="h-3 w-1/2 bg-muted rounded" />
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

// ─── Action icons ─────────────────────────────────────────────────────────────

const ACTION_ICONS: Record<ActionItem["action_type"], typeof ShieldX> = {
    no_secops: UserX,
    server_offline: ShieldX,
    server_warning: TimerOff,
};

const SEVERITY_BORDER: Record<ActionItem["severity"], string> = {
    critical: "text-red-400 bg-red-500/10 border-red-500/20",
    warning: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    info: "text-blue-400 bg-blue-500/10 border-blue-500/20",
};

// ─── Completed Modal ──────────────────────────────────────────────────────────

function CompletedModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const { data: completed, isLoading } = useCompletedActions();

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card border border-border rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl">
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-2">
                        <ScrollText className="size-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold text-foreground">
                            Completed Actions
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md hover:bg-muted transition-colors"
                    >
                        <X className="size-4 text-muted-foreground" />
                    </button>
                </div>
                <div className="flex-1 overflow-auto p-4 space-y-2">
                    {isLoading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <ActionCardSkeleton key={i} />
                        ))
                    ) : !completed?.length ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            No completed actions.
                        </p>
                    ) : (
                        completed.map((action) => (
                            <div
                                key={action.id}
                                className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                            >
                                <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-foreground/70 line-through truncate">
                                        {action.message}
                                    </p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {action.client_name}
                                        {action.server_name &&
                                            ` · ${action.server_name}`}
                                        {action.assigned_to_name &&
                                            ` · ${action.assigned_to_name}`}
                                    </p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuthContext();
    const [completedOpen, setCompletedOpen] = useState(false);

    const {
        data: stats,
        isLoading: statsLoading,
        isError: statsError,
        retry,
    } = useDashboardStats();
    const { data: actions, isLoading: actionsLoading } = useDashboardActions();
    const claimMutation = useClaimAction();
    const statusMutation = useUpdateActionStatus();

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
          ]
        : [];

    return (
        <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
            <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div>
                    <div className="flex h-16 items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Activity className="w-5 h-5 text-primary" />
                            </div>
                            <h1 className="text-lg font-semibold tracking-tight">
                                Dashboard
                            </h1>
                        </div>

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

            <main className="py-6 w-full flex-1 min-h-0 overflow-auto">
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

                {/* ── Donut Chart + Action Board ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Pie chart */}
                    <div className="lg:col-span-1 rounded-xl border border-border/60 bg-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-foreground">
                                Server Overview
                            </h2>
                            {!statsLoading && (
                                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                    <span
                                        onClick={() => navigate("/clients")}
                                        className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
                                    >
                                        <Landmark className="size-3.5" />
                                        <span>{stats?.total_clients ?? 0}</span>
                                        <span className="text-muted-foreground/60">clients</span>
                                    </span>
                                    <span
                                        onClick={() => navigate("/servers")}
                                        className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
                                    >
                                        <Server className="size-3.5" />
                                        <span>{stats?.total_servers ?? 0}</span>
                                        <span className="text-muted-foreground/60">servers</span>
                                    </span>
                                </div>
                            )}
                        </div>
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
                                            onClick={() =>
                                                navigate(
                                                    `/servers?status=${d.name.toLowerCase()}`,
                                                )
                                            }
                                            className="flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity"
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

                    {/* Action Board */}
                    <div className="lg:col-span-2 rounded-xl border border-border/60 bg-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-foreground">
                                Action Board
                            </h2>
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    icon={<ScrollText size={14} />}
                                    label="Completed"
                                    onClick={() => setCompletedOpen(true)}
                                />
                                {actions && actions.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        {actions.length} active
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-1">
                            {actionsLoading ? (
                                Array.from({ length: 4 }).map((_, i) => (
                                    <ActionCardSkeleton key={i} />
                                ))
                            ) : !actions?.length ? (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No pending actions.
                                </p>
                            ) : (
                                actions.map((action) => {
                                    const Icon =
                                        ACTION_ICONS[action.action_type];
                                    const border =
                                        SEVERITY_BORDER[action.severity];
                                    const isMine =
                                        user &&
                                        action.assigned_to === user.id;

                                    return (
                                        <div
                                            key={action.id}
                                            className={cn(
                                                "rounded-lg border p-4 transition-colors",
                                                isMine
                                                    ? "border-primary/30 bg-primary/5"
                                                    : "border-border/60 hover:bg-muted/20",
                                            )}
                                        >
                                            <div className="flex items-start gap-3">
                                                <div
                                                    className={cn(
                                                        "p-1.5 rounded-lg border shrink-0 mt-0.5",
                                                        border,
                                                    )}
                                                >
                                                    <Icon className="size-4" />
                                                </div>

                                                <div
                                                    className="flex-1 min-w-0 cursor-pointer"
                                                    onClick={() => {
                                                        if (
                                                            action.server_id
                                                        ) {
                                                            navigate(
                                                                `/servers/${action.server_id}`,
                                                            );
                                                        } else if (
                                                            action.client_id
                                                        ) {
                                                            navigate(
                                                                `/clients/${action.client_id}`,
                                                            );
                                                        }
                                                    }}
                                                >
                                                    <p className="text-sm font-medium text-foreground truncate">
                                                        {action.message}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                                                        {action.client_name}
                                                        {action.server_name &&
                                                            ` · ${action.server_name}`}
                                                    </p>
                                                    {action.assigned_to_name && (
                                                        <div className="flex items-center gap-1 mt-1.5">
                                                            <Circle className="size-2.5 fill-primary text-primary" />
                                                            <span className="text-[11px] text-muted-foreground">
                                                                {action.assigned_to_name}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1 shrink-0">
                                                    {action.status ===
                                                        "completed" ? null : isMine ? (
                                                        <>
                                                            <button
                                                                title="Unclaim"
                                                                onClick={() =>
                                                                    claimMutation.mutate(
                                                                        action.id,
                                                                    )
                                                                }
                                                                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                                            >
                                                                <UserPlus className="size-4" />
                                                            </button>
                                                            <button
                                                                title="Mark completed"
                                                                onClick={() =>
                                                                    statusMutation.mutate(
                                                                        {
                                                                            actionId:
                                                                                action.id,
                                                                            status:
                                                                                "completed",
                                                                        },
                                                                    )
                                                                }
                                                                className="p-1.5 rounded-md hover:bg-muted transition-colors text-emerald-400 hover:text-emerald-300"
                                                            >
                                                                <CircleCheckBig className="size-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <button
                                                            title="Claim"
                                                            onClick={() =>
                                                                claimMutation.mutate(
                                                                    action.id,
                                                                )
                                                            }
                                                            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                                                        >
                                                            <CircleEllipsis className="size-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Top Usage Rankings ── */}
                <div className="mt-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Gauge className="w-4 h-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold text-foreground">
                            Top Usage
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

            <CompletedModal
                open={completedOpen}
                onClose={() => setCompletedOpen(false)}
            />
        </div>
    );
}
