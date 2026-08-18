import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import PageLayout from "@/components/PageLayout";
import {
    Activity,
    Server,
    Landmark,
    Users2,
    AlertTriangle,
    Gauge,
    RefreshCw,
    ShieldX,
    UserX,
    CheckCircle2,
    Circle,
    CircleCheckBig,
    CircleEllipsis,
    ScrollText,
    X,
    Link2Off,
    Clock,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { useDashboardStats } from "./hooks/useDashboard";
import {
    useDashboardActions,
    useCompletedActions,
    useClaimAction,
    useUpdateActionStatus,
    type ActionItem,
} from "./hooks/useDashboardActions";
import { useAuthContext } from "@/hooks/useAuthContext";
import { getEchoInstance } from "@/hooks/useServerSocket";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import IndexHeader from "@/components/IndexHeader";
import { DashboardChartsSection } from "./components/DashboardMetricChart";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
    online: "#10b981",
    warning: "#f59e0b",
    offline: "#ef4444",
    pending_installation: "#94a3b8",
    waiting_for_installation: "#f59e0b",
    pending_deletion: "#fb923c",
};

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

// ─── Action icons ─────────────────────────────────────────────────────────────

const ACTION_ICONS: Record<ActionItem["action_type"], typeof ShieldX> = {
    no_secops: UserX,
    server_offline: ShieldX,
};

const SEVERITY_BORDER: Record<ActionItem["severity"], string> = {
    notice: "text-yellow-300 bg-yellow-300/10 border-yellow-300/20",
    warning: "text-orange-400 bg-orange-400/10 border-orange-400/20",
    critical: "text-red-400 bg-red-500/10 border-red-500/20",
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
                        className="p-1 rounded-md hover:bg-muted transition-colors cursor-pointer"
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
                                    {action.created_at && (
                                        <p className="flex items-center gap-1 text-[11px] text-muted-foreground/70 mt-0.5">
                                            <Clock className="size-3" />
                                            {new Date(
                                                action.created_at,
                                            ).toLocaleString(undefined, {
                                                month: "short",
                                                day: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
                                    )}
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

    const leftDivRef = useRef<HTMLDivElement>(null);
    const [leftDivHeight, setLeftDivHeight] = useState(0);

    const queryClient = useQueryClient();

    useEffect(() => {
        const echo = getEchoInstance();
        const channel = echo.private("dashboard");

        channel.listen(".ActionItemsUpdated", () => {
            console.log("[WS] Action items updated. Invalidate queries.");
            queryClient.invalidateQueries({
                queryKey: ["dashboard", "actions"],
            });
            queryClient.invalidateQueries({
                queryKey: ["dashboard", "actions", "completed"],
            });
        });

        return () => {
            channel.stopListening(".ActionItemsUpdated");
        };
    }, [queryClient]);

    useEffect(() => {
        if (leftDivRef.current) {
            setLeftDivHeight(leftDivRef.current.offsetHeight);
        }
    }, [stats]);

    const pieData = stats
        ? [
              {
                  name: "Online",
                  value: stats.online_count,
                  color: STATUS_COLORS.online,
              },
              {
                  name: "Offline",
                  value: stats.offline_count,
                  color: STATUS_COLORS.offline,
              },
              {
                  name: "Pending Installation",
                  value: stats.pending_installation_count,
                  color: STATUS_COLORS.pending_installation,
                  status: "pending_installation",
              },
              {
                  name: "Waiting For Installation",
                  value: stats.waiting_for_installation_count ?? 0,
                  color: STATUS_COLORS.waiting_for_installation,
                  status: "waiting_for_installation",
              },
              {
                  name: "Pending Deletion",
                  value: stats.pending_deletion_count,
                  color: STATUS_COLORS.pending_deletion,
                  status: "pending_deletion",
              },
          ].filter((d) => d.value > 0)
        : [];

    return (
        <PageLayout>
            <IndexHeader icon={Activity} title="Dashboard" />

            <main className="w-full flex-1 min-h-0">
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

                {/* ── Cards + Server Overview + Action Board ── */}
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    <div
                        ref={leftDivRef}
                        className="min-w-0 flex-1 w-full max-w-130 space-y-6"
                    >
                        {/* Stat Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <Link
                                to="/servers"
                                className="rounded-xl border border-border/60 bg-card p-5 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors h-fit w-full"
                            >
                                <div className="p-3 rounded-lg bg-primary/10 text-primary">
                                    <Server className="size-6" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">
                                        {statsLoading
                                            ? "—"
                                            : (stats?.total_servers ?? 0)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Servers
                                    </p>
                                </div>
                            </Link>
                            <Link
                                to="/clients"
                                className="rounded-xl border border-border/60 bg-card p-5 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors h-fit w-full"
                            >
                                <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
                                    <Landmark className="size-6" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">
                                        {statsLoading
                                            ? "—"
                                            : (stats?.total_clients ?? 0)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Clients
                                    </p>
                                </div>
                            </Link>
                            <Link
                                to="/users"
                                className="rounded-xl border border-border/60 bg-card p-5 flex items-center gap-4 cursor-pointer hover:bg-muted/30 transition-colors h-fit w-full"
                            >
                                <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400">
                                    <Users2 className="size-6" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-foreground">
                                        {statsLoading
                                            ? "—"
                                            : (stats?.total_users ?? 0)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Users
                                    </p>
                                </div>
                            </Link>
                        </div>

                        {/* Server Overview */}
                        <div className="rounded-xl border border-border/60 bg-card p-6 h-fit w-full">
                            <h2 className="text-sm font-semibold text-foreground mb-4">
                                Server Overview
                            </h2>
                            {statsLoading ? (
                                <PieChartSkeleton />
                            ) : pieData.length > 0 ? (
                                <div className="flex flex-col items-center">
                                    <ResponsiveContainer
                                        width="100%"
                                        height={220}
                                    >
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
                                            <Tooltip
                                                content={<ChartTooltip />}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    <div className="flex flex-wrap gap-4 mt-2 justify-center">
                                        {pieData.map((d) => (
                                            <Link
                                                key={d.name}
                                                to={`/servers?status=${d.status ?? d.name.toLowerCase()}`}
                                                className="flex items-center gap-1.5 text-xs cursor-pointer hover:opacity-80 transition-opacity"
                                            >
                                                <span
                                                    className="w-2.5 h-2.5 rounded-full"
                                                    style={{
                                                        backgroundColor:
                                                            d.color,
                                                    }}
                                                />
                                                <span className="text-muted-foreground">
                                                    {d.name}
                                                </span>
                                                <span className="font-medium text-foreground">
                                                    {d.value}
                                                </span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground text-center py-8">
                                    No servers
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Action Board */}
                    <div
                        className="w-full flex-1 min-w-0 rounded-xl border border-border/60 bg-card flex flex-col min-h-0"
                        style={{
                            height: leftDivHeight ? leftDivHeight : undefined,
                        }}
                    >
                        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                            <div className="flex items-center gap-6">
                                <h2 className="text-sm font-semibold text-foreground">
                                    Action Board
                                </h2>
                                {actions && actions.length > 0 && (
                                    <span className="text-xs text-muted-foreground">
                                        {actions.length} active
                                    </span>
                                )}
                            </div>

                            <Button
                                className="cursor-pointer"
                                variant="ghost"
                                size="sm"
                                icon={<ScrollText size={14} />}
                                label="Completed"
                                onClick={() => setCompletedOpen(true)}
                            />
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 p-4 pt-3 space-y-1">
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
                                        action.assigned_to_uuid === user.uuid;

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

                                                <Link
                                                    className="flex-1 min-w-0 cursor-pointer"
                                                    to={
                                                        action.server_uuid
                                                            ? `/servers/${action.server_uuid}`
                                                            : action.client_uuid
                                                              ? `/clients/${action.client_uuid}`
                                                              : "#"
                                                    }
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
                                                                {
                                                                    action.assigned_to_name
                                                                }
                                                            </span>
                                                        </div>
                                                    )}
                                                    {action.created_at && (
                                                        <div className="flex items-center gap-1 mt-1.5">
                                                            <Clock className="size-3 text-muted-foreground/60" />
                                                            <span className="text-[11px] text-muted-foreground/70">
                                                                {new Date(
                                                                    action.created_at,
                                                                ).toLocaleString(
                                                                    undefined,
                                                                    {
                                                                        month: "short",
                                                                        day: "numeric",
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                    },
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                </Link>

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
                                                                <Link2Off className="size-4" />
                                                            </button>
                                                            <button
                                                                title="Mark completed"
                                                                onClick={() =>
                                                                    statusMutation.mutate(
                                                                        {
                                                                            actionId:
                                                                                action.id,
                                                                            status: "completed",
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

                {/* ── Charts Section ── */}
                <div className="mt-8">
                    <div className="flex items-center gap-2 mb-4">
                        <Gauge className="w-4 h-4 text-muted-foreground" />
                        <h2 className="text-sm font-semibold text-foreground">
                            Usage
                        </h2>
                    </div>
                    <DashboardChartsSection />
                </div>
            </main>

            <CompletedModal
                open={completedOpen}
                onClose={() => setCompletedOpen(false)}
            />
        </PageLayout>
    );
}
