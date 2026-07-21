import { useEffect, useMemo, useState } from "react";
import PageLayout from "@/components/PageLayout";
import {
    Smartphone,
    Monitor,
    Tablet,
    ShieldCheck,
    ShieldAlert,
    Ban,
    CheckCircle,
    RefreshCw,
    LogOut,
    Trash2,
    AlertTriangle,
    Clock,
    Globe,
    Laptop,
    Activity,
    Terminal,
    UserCheck,
    Fingerprint,
    ChevronLeft,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useJwtAuth } from "@/hooks/useJwtAuth";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

function getDeviceIcon(type: string | null, size = "w-4 h-4") {
    switch (type) {
        case "mobile":
            return <Smartphone className={size} />;
        case "tablet":
            return <Tablet className={size} />;
        case "desktop":
            return <Monitor className={size} />;
        default:
            return <Laptop className={size} />;
    }
}

function getStatusBadge(status: string, compromised: boolean) {
    if (compromised) {
        return (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-red-500/10 text-red-600 dark:text-red-400 ring-1 ring-inset ring-red-500/20">
                <ShieldAlert className="w-3 h-3" />
                Compromised
            </span>
        );
    }
    switch (status) {
        case "active":
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-inset ring-emerald-500/20">
                    <ShieldCheck className="w-3 h-3" />
                    Active
                </span>
            );
        case "revoked":
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground ring-1 ring-inset ring-border">
                    <Ban className="w-3 h-3" />
                    Revoked
                </span>
            );
        case "expired":
            return (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-inset ring-amber-500/20">
                    <Clock className="w-3 h-3" />
                    Expired
                </span>
            );
        default:
            return null;
    }
}

function Skeleton({ className = "" }: { className?: string }) {
    return (
        <div className={`animate-pulse rounded-xl bg-muted/60 ${className}`} />
    );
}

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: string;
    confirmLabel?: string;
    variant?: "default" | "destructive";
    onConfirm: () => void;
    onCancel: () => void;
    loading?: boolean;
}

function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel = "Confirm",
    variant = "default",
    onConfirm,
    onCancel,
    loading,
}: ConfirmDialogProps) {
    if (!open) return null;
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={onCancel}
        >
            <div
                className="bg-background rounded-xl shadow-lg border border-border p-6 max-w-sm w-full mx-4 relative animate-in fade-in-50 zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${
                        variant === "destructive"
                            ? "bg-red-500/10 text-red-600"
                            : "bg-muted text-muted-foreground"
                    }`}
                >
                    {variant === "destructive" ? (
                        <AlertTriangle className="w-5 h-5" />
                    ) : (
                        <ShieldAlert className="w-5 h-5" />
                    )}
                </div>
                <h3 className="text-base font-semibold tracking-tight text-foreground mb-1">
                    {title}
                </h3>
                <p className="text-sm text-muted-foreground mb-5">
                    {description}
                </p>
                <div className="flex gap-2 justify-end">
                    <Button
                        variant="outline"
                        onClick={onCancel}
                        disabled={loading}
                        size="sm"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant={
                            variant === "destructive" ? "danger" : "default"
                        }
                        onClick={onConfirm}
                        disabled={loading}
                        size="sm"
                        className="gap-2"
                    >
                        {loading && (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        )}
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function Sessions() {
    const { setTrail } = useBreadcrumb();
    const navigate = useNavigate();
    const {
        sessions,
        sessionsLoading,
        fetchSessions,
        revokeSession,
        revokeAllOtherSessions,
        permanentDeleteSession,
        logout,
        securityActivity,
        securityActivityLoading,
        fetchSecurityActivity,
    } = useJwtAuth();

    const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [confirmLogoutOthers, setConfirmLogoutOthers] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        setTrail([
            { label: "Settings", href: "/settings" },
            { label: "Sessions & Devices" },
        ]);
    }, [setTrail]);

    useEffect(() => {
        fetchSessions();
        fetchSecurityActivity();
    }, [fetchSessions, fetchSecurityActivity]);

    const currentSession = useMemo(
        () => sessions.find((s) => s.current_session),
        [sessions],
    );

    const otherSessions = useMemo(
        () => sessions.filter((s) => !s.current_session),
        [sessions],
    );

    const compromisedSessions = useMemo(
        () => sessions.filter((s) => s.compromised),
        [sessions],
    );

    const activeSessionsCount = useMemo(
        () =>
            sessions.filter((s) => s.status === "active" || s.current_session)
                .length,
        [sessions],
    );

    const handleRevokeSession = async (sessionUuid: string) => {
        setActionLoading(true);
        try {
            await revokeSession(sessionUuid);
            toast.success("Session revoked successfully");
            setConfirmRevoke(null);
        } catch {
            toast.error("Failed to revoke session");
        } finally {
            setActionLoading(false);
        }
    };

    const handlePermanentDelete = async (sessionUuid: string) => {
        setActionLoading(true);
        try {
            await permanentDeleteSession(sessionUuid);
            toast.success("Session deleted permanently");
            setConfirmDelete(null);
        } catch {
            toast.error("Failed to delete session");
        } finally {
            setActionLoading(false);
        }
    };

    const handleRevokeAllOthers = async () => {
        setActionLoading(true);
        try {
            await revokeAllOtherSessions();
            toast.success("All other devices signed out");
            setConfirmLogoutOthers(false);
            fetchSessions();
        } catch {
            toast.error("Failed to sign out other devices");
        } finally {
            setActionLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchSessions();
        fetchSecurityActivity();
        toast.success("Session list refreshed");
    };

    const lastActivity = currentSession?.last_activity_at_timestamp
        ? formatRelativeTime(currentSession.last_activity_at_timestamp)
        : "Just now";

    if (sessionsLoading) {
        return (
            <div className="flex-1 flex flex-col min-h-0 p-6 max-w-4xl mx-auto w-full gap-6">
                <div className="space-y-2">
                    <Skeleton className="h-7 w-48" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-xl" />
                    ))}
                </div>
                <Skeleton className="h-44 rounded-xl" />
                <Skeleton className="h-44 rounded-xl" />
            </div>
        );
    }

    return (
        <TooltipProvider>
            <ConfirmDialog
                open={confirmRevoke !== null}
                title="Sign out this device?"
                description="This will immediately revoke this session and require the user to sign in again."
                confirmLabel="Sign Out"
                variant="destructive"
                onConfirm={() =>
                    confirmRevoke && handleRevokeSession(confirmRevoke)
                }
                onCancel={() => setConfirmRevoke(null)}
                loading={actionLoading}
            />

            <ConfirmDialog
                open={confirmDelete !== null}
                title="Delete this session?"
                description="This action cannot be undone. The session record will be permanently removed."
                confirmLabel="Delete"
                variant="destructive"
                onConfirm={() =>
                    confirmDelete && handlePermanentDelete(confirmDelete)
                }
                onCancel={() => setConfirmDelete(null)}
                loading={actionLoading}
            />

            <ConfirmDialog
                open={confirmLogoutOthers}
                title="Sign out all other devices?"
                description="This will sign out your account on all other devices. Your current device will remain signed in."
                confirmLabel="Sign Out All"
                variant="destructive"
                onConfirm={handleRevokeAllOthers}
                onCancel={() => setConfirmLogoutOthers(false)}
                loading={actionLoading}
            />

            <PageLayout className="selection:bg-primary/10">
                <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
                    <div className="flex items-center justify-between gap-4 py-4 px-6 sm:px-8 lg:px-10 max-w-4xl mx-auto w-full">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate("/settings")}
                                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                                aria-label="Back to Settings"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>
                            <div className="space-y-0.5">
                                <h1 className="text-xl font-semibold tracking-tight text-foreground flex items-center gap-2">
                                    Sessions & Devices
                                </h1>
                                <p className="text-xs text-muted-foreground">
                                    Manage active sessions across your hardware
                                    profile.
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleRefresh}
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Refresh sessions"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </Button>
                            {otherSessions.filter((s) => s.status === "active")
                                .length > 0 && (
                                <Button
                                    onClick={() => setConfirmLogoutOthers(true)}
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-1.5 hidden sm:flex text-xs font-medium cursor-pointer"
                                >
                                    <LogOut className="w-3.5 h-3.5" />
                                    Sign Out Others
                                </Button>
                            )}
                        </div>
                    </div>
                </header>

                <main className="py-6 w-full flex-1">
                    <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-10 flex flex-col gap-6">
                        {/* Summary Metrics */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            {[
                                {
                                    label: "Active Sessions",
                                    value: activeSessionsCount,
                                    icon: Activity,
                                    color: "text-blue-500 bg-blue-500/10",
                                },
                                {
                                    label: "Current Device",
                                    value:
                                        currentSession?.host_name ?? "Unknown",
                                    icon: Monitor,
                                    color: "text-violet-500 bg-violet-500/10",
                                    truncate: true,
                                },
                                {
                                    label: "Last Activity",
                                    value: lastActivity,
                                    icon: Clock,
                                    color: "text-amber-500 bg-amber-500/10",
                                },
                                {
                                    label: "Security Status",
                                    value:
                                        compromisedSessions.length > 0
                                            ? `${compromisedSessions.length} Alert${compromisedSessions.length > 1 ? "s" : ""}`
                                            : "Secure",
                                    icon: ShieldCheck,
                                    color:
                                        compromisedSessions.length > 0
                                            ? "text-red-500 bg-red-500/10"
                                            : "text-emerald-500 bg-emerald-500/10",
                                },
                            ].map((card, idx) => (
                                <div
                                    key={idx}
                                    className="bg-card border border-border/50 rounded-xl p-4 shadow-sm flex items-center justify-between gap-3"
                                >
                                    <div className="space-y-1 min-w-0">
                                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                                            {card.label}
                                        </p>
                                        <p
                                            className={`text-base font-semibold text-foreground tracking-tight ${card.truncate ? "truncate max-w-[140px]" : ""}`}
                                        >
                                            {card.value}
                                        </p>
                                    </div>
                                    <div
                                        className={`p-2 rounded-lg shrink-0 ${card.color}`}
                                    >
                                        <card.icon className="w-4 h-4" />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Compromised Sessions Alerts */}
                        {compromisedSessions.length > 0 && (
                            <section className="space-y-2">
                                <h2 className="text-xs font-semibold uppercase tracking-wider text-red-500 flex items-center gap-2">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    Security Incidents
                                </h2>
                                <div className="space-y-2">
                                    {compromisedSessions.map((session) => (
                                        <div
                                            key={session.session_uuid}
                                            className="bg-red-500/[0.02] border border-red-500/20 rounded-xl p-4 flex items-start justify-between gap-4"
                                        >
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div className="p-2 bg-red-500/10 rounded-lg text-red-500 shrink-0">
                                                    {getDeviceIcon(
                                                        session.device_type,
                                                        "w-4 h-4",
                                                    )}
                                                </div>
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-medium text-sm text-foreground">
                                                            {session.host_name ??
                                                                "Unknown Device"}
                                                        </span>
                                                        {getStatusBadge(
                                                            session.status,
                                                            session.compromised,
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {session.compromise_reason ??
                                                            "Security threat flagged"}
                                                    </p>
                                                    {session.compromised_at && (
                                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <Clock className="w-3 h-3" />
                                                            {
                                                                session.compromised_at
                                                            }
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() =>
                                                    setConfirmDelete(
                                                        session.session_uuid,
                                                    )
                                                }
                                                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 shrink-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Current Session Panel */}
                        {currentSession && (
                            <section className="space-y-2">
                                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Active Workspace
                                </h2>
                                <div className="bg-card border border-border/50 rounded-xl overflow-hidden shadow-sm">
                                    <div className="p-5 flex items-start justify-between gap-4 border-b border-border/40">
                                        <div className="flex items-start gap-3.5 min-w-0">
                                            <div className="p-2.5 bg-primary/10 rounded-lg text-primary shrink-0">
                                                {getDeviceIcon(
                                                    currentSession.device_type,
                                                    "w-4 h-4",
                                                )}
                                            </div>
                                            <div className="min-w-0 space-y-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-medium text-sm text-foreground">
                                                        {currentSession.host_name ??
                                                            "Unknown Device"}
                                                    </h3>
                                                    {getStatusBadge(
                                                        currentSession.status,
                                                        currentSession.compromised,
                                                    )}
                                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400">
                                                        <CheckCircle className="w-3 h-3" />
                                                        Current Session
                                                    </span>
                                                    {currentSession.remember_me && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                                            <Fingerprint className="w-3 h-3" />
                                                            Trusted
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">
                                                    Authorized session linked to
                                                    your personal verification
                                                    token.
                                                </p>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => logout()}
                                            className="h-8 gap-1.5 text-xs font-medium text-muted-foreground hover:text-red-500 hover:border-red-500/30 cursor-pointer"
                                        >
                                            <LogOut className="w-3.5 h-3.5" />
                                            Sign Out
                                        </Button>
                                    </div>
                                    <div className="bg-muted/[0.15] px-5 py-3.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-y-3 gap-x-4">
                                        {[
                                            {
                                                label: "Browser",
                                                val: currentSession.browser,
                                            },
                                            {
                                                label: "OS Profile",
                                                val: currentSession.operating_system,
                                            },
                                            {
                                                label: "Hardware",
                                                val: currentSession.device_type,
                                                capitalize: true,
                                            },
                                            {
                                                label: "IP Core",
                                                val: currentSession.ip_address,
                                                mono: true,
                                            },
                                            {
                                                label: "Created At",
                                                val: currentSession.created_at,
                                            },
                                            {
                                                label: "Last Sync",
                                                val: lastActivity,
                                            },
                                        ].map((meta, idx) => (
                                            <div
                                                key={idx}
                                                className="space-y-0.5"
                                            >
                                                <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                                    {meta.label}
                                                </p>
                                                <p
                                                    className={`text-xs font-medium text-foreground ${meta.mono ? "font-mono text-[11px]" : ""} ${meta.capitalize ? "capitalize" : ""}`}
                                                >
                                                    {meta.val ?? "—"}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* Other Managed Sessions */}
                        <section className="space-y-2">
                            <div className="flex items-center justify-between">
                                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    Connected Instances
                                </h2>
                                <span className="text-xs text-muted-foreground">
                                    {
                                        otherSessions.filter(
                                            (s) => s.status === "active",
                                        ).length
                                    }{" "}
                                    active hardware access lines
                                </span>
                            </div>

                            {otherSessions.length === 0 ? (
                                <div className="bg-card border border-border/50 rounded-xl p-8 text-center border-dashed">
                                    <div className="p-2.5 bg-muted text-muted-foreground rounded-lg w-fit mx-auto mb-2.5">
                                        <Monitor className="w-4 h-4" />
                                    </div>
                                    <p className="font-medium text-xs text-foreground">
                                        Isolated Session Environment
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        No secondary devices are currently
                                        attached to this core pipeline.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {otherSessions.map((session) => (
                                        <div
                                            key={session.session_uuid}
                                            className="bg-card border border-border/50 rounded-xl p-4 flex items-center justify-between gap-4 shadow-sm hover:border-border transition-colors"
                                        >
                                            <div className="flex items-start gap-3 min-w-0">
                                                <div
                                                    className={`p-2 rounded-lg shrink-0 ${
                                                        session.status ===
                                                            "active" &&
                                                        !session.compromised
                                                            ? "bg-emerald-500/10 text-emerald-600"
                                                            : "bg-muted text-muted-foreground"
                                                    }`}
                                                >
                                                    {getDeviceIcon(
                                                        session.device_type,
                                                        "w-4 h-4",
                                                    )}
                                                </div>
                                                <div className="min-w-0 space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h3 className="font-medium text-sm text-foreground truncate max-w-[220px]">
                                                            {session.host_name ??
                                                                "Unknown Device"}
                                                        </h3>
                                                        {getStatusBadge(
                                                            session.status,
                                                            session.compromised,
                                                        )}
                                                        {session.remember_me && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                                                <Fingerprint className="w-3 h-3" />
                                                                Trusted
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <Terminal className="w-3 h-3 shrink-0" />
                                                            {session.browser ||
                                                                "Unknown Platform"}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1 font-mono text-[11px]">
                                                            <Globe className="w-3 h-3" />
                                                            {session.ip_address ??
                                                                "No IP"}
                                                        </span>
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <UserCheck className="w-3 h-3" />
                                                            Linked:{" "}
                                                            {session.created_at}
                                                        </span>
                                                        <span>•</span>
                                                        <span className="flex items-center gap-1">
                                                            <Activity className="w-3 h-3" />
                                                            Sync:{" "}
                                                            {session.last_activity_at ??
                                                                "Unknown"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center shrink-0">
                                                {session.status === "active" &&
                                                    !session.compromised && (
                                                        <Tooltip>
                                                            <TooltipTrigger
                                                                asChild
                                                            >
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={() =>
                                                                        setConfirmRevoke(
                                                                            session.session_uuid,
                                                                        )
                                                                    }
                                                                    className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 cursor-pointer"
                                                                >
                                                                    <LogOut className="w-4 h-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>
                                                                Disconnect
                                                                device
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                {(session.status ===
                                                    "revoked" ||
                                                    session.compromised) && (
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() =>
                                                                    setConfirmDelete(
                                                                        session.session_uuid,
                                                                    )
                                                                }
                                                                className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </TooltipTrigger>
                                                        <TooltipContent>
                                                            Purge record
                                                            permanently
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Audit Logs */}
                        <section className="space-y-2">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Security Stream Audit Logs
                            </h2>
                            {securityActivityLoading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <Skeleton
                                            key={i}
                                            className="h-12 rounded-xl"
                                        />
                                    ))}
                                </div>
                            ) : securityActivity.length === 0 ? (
                                <div className="bg-card border border-border/50 rounded-xl p-4 text-center">
                                    <p className="text-xs text-muted-foreground">
                                        No cryptographic changes audited.
                                    </p>
                                </div>
                            ) : (
                                <div className="bg-card border border-border/50 rounded-xl divide-y divide-border/40 overflow-hidden shadow-sm">
                                    {securityActivity
                                        .slice(0, 10)
                                        .map((activity) => (
                                            <div
                                                key={activity.id}
                                                className="flex items-center gap-3 p-3 text-xs hover:bg-muted/[0.05] transition-colors"
                                            >
                                                <div className="p-1.5 bg-muted text-muted-foreground rounded-md shrink-0">
                                                    {getActivityIcon(
                                                        activity.event_type,
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0 space-y-0.5">
                                                    <p className="font-medium text-foreground">
                                                        {formatEventType(
                                                            activity.event_type,
                                                        )}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {activity.created_at}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </section>
                    </div>
                </main>
            </PageLayout>
        </TooltipProvider>
    );
}

function getActivityIcon(type: string) {
    const iconSize = "w-3.5 h-3.5";
    switch (type) {
        case "login":
            return <ShieldCheck className={`${iconSize} text-emerald-500`} />;
        case "logout":
            return <LogOut className={`${iconSize}`} />;
        case "refresh":
            return <RefreshCw className={`${iconSize} text-blue-500`} />;
        case "session_revoked":
            return <Ban className={`${iconSize} text-amber-500`} />;
        case "session_compromised":
        case "refresh_token_reuse_detected":
            return <ShieldAlert className={`${iconSize} text-red-500`} />;
        default:
            return <ShieldCheck className={`${iconSize}`} />;
    }
}

function formatEventType(type: string): string {
    const map: Record<string, string> = {
        login: "User session authenticated",
        logout: "Token identity signing off",
        refresh: "Lifecycle rotation token verified",
        session_revoked: "Device connection terminated",
        session_compromised: "Malicious signature intercepted",
        refresh_token_reuse_detected: "Token re-use hazard captured",
    };
    return map[type] ?? type.replace(/_/g, " ");
}

function formatRelativeTime(timestamp: string): string {
    const now = Date.now();
    const time = new Date(timestamp).getTime();
    const diff = now - time;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
}
