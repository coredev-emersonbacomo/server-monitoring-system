import { useEffect, useMemo, useState } from "react";
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
  XCircle,
  Activity,
  Terminal,
  UserCheck,
  Fingerprint,
} from "lucide-react";
import { useJwtAuth } from "@/hooks/useJwtAuth";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function getDeviceIcon(type: string | null, size = "w-5 h-5") {
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
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800">
        <ShieldAlert className="w-3 h-3" />
        Compromised
      </span>
    );
  }
  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800">
          <ShieldCheck className="w-3 h-3" />
          Active
        </span>
      );
    case "revoked":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
          <Ban className="w-3 h-3" />
          Revoked
        </span>
      );
    case "expired":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800">
          <Clock className="w-3 h-3" />
          Expired
        </span>
      );
    default:
      return null;
  }
}

function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />;
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

function ConfirmDialog({ open, title, description, confirmLabel = "Confirm", variant = "default", onConfirm, onCancel, loading }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onCancel}>
      <div className="bg-background rounded-xl shadow-2xl border border-border p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-4 ${variant === "destructive" ? "bg-red-100 dark:bg-red-900" : "bg-muted"}`}>
          {variant === "destructive" ? (
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-foreground" />
          )}
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-6">{description}</p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors disabled:opacity-50 flex items-center gap-2 ${
              variant === "destructive"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-primary hover:bg-primary/90"
            }`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Sessions() {
  const { setTrail } = useBreadcrumb();
  const {
    sessions,
    sessionsLoading,
    fetchSessions,
    revokeSession,
    revokeAllOtherSessions,
    permanentDeleteSession,
    user,
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
      { label: "Sessions & Devices", href: "/settings/sessions" },
    ]);
  }, [setTrail]);

  useEffect(() => {
    fetchSessions();
    fetchSecurityActivity();
  }, [fetchSessions, fetchSecurityActivity]);

  const currentSession = useMemo(
    () => sessions.find((s) => s.current_session),
    [sessions]
  );

  const otherSessions = useMemo(
    () => sessions.filter((s) => !s.current_session),
    [sessions]
  );

  const compromisedSessions = useMemo(
    () => sessions.filter((s) => s.compromised),
    [sessions]
  );

  const activeSessionsCount = useMemo(
    () => sessions.filter((s) => s.status === "active" || s.current_session).length,
    [sessions]
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
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <ConfirmDialog
        open={confirmRevoke !== null}
        title="Sign out this device?"
        description="This will immediately revoke this session and require the user to sign in again."
        confirmLabel="Sign Out"
        variant="destructive"
        onConfirm={() => confirmRevoke && handleRevokeSession(confirmRevoke)}
        onCancel={() => setConfirmRevoke(null)}
        loading={actionLoading}
      />

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this session?"
        description="This action cannot be undone. The session record will be permanently removed."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => confirmDelete && handlePermanentDelete(confirmDelete)}
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

      <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
        <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
          <div className="flex items-start justify-between gap-4 py-3 px-6 sm:px-8 lg:px-10">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/10 rounded-lg mt-0.5">
                <ShieldCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-semibold tracking-tight">Sessions & Devices</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Manage where your account is signed in and review recent activity.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                title="Refresh sessions"
              >
                <RefreshCw className="w-4 h-4 text-muted-foreground" />
              </button>
              {otherSessions.filter((s) => s.status === "active").length > 0 && (
                <Button
                  onClick={() => setConfirmLogoutOthers(true)}
                  variant="outline"
                  className="text-sm gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out All Other Devices
                </Button>
              )}
            </div>
          </div>
        </header>

        <main className="py-6 w-full flex-1 min-h-0 overflow-auto">
          <div className="max-w-4xl mx-auto px-6 sm:px-8 lg:px-10 flex flex-col gap-6">

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1 bg-blue-500 rounded-l-xl" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Sessions</p>
                    <p className="text-2xl font-bold mt-1.5">{activeSessionsCount}</p>
                  </div>
                  <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1 bg-violet-500 rounded-l-xl" />
                <div className="flex items-start justify-between">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Current Device</p>
                    <p className="text-sm font-medium mt-1.5 truncate max-w-[160px]">
                      {currentSession?.device_name ?? "Unknown"}
                    </p>
                  </div>
                  <div className="p-2 bg-violet-50 dark:bg-violet-950 rounded-lg">
                    <Monitor className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1 bg-amber-500 rounded-l-xl" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Last Activity</p>
                    <p className="text-sm font-medium mt-1.5">{lastActivity}</p>
                  </div>
                  <div className="p-2 bg-amber-50 dark:bg-amber-950 rounded-lg">
                    <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
              </div>
              <div className="bg-card border border-border/60 rounded-xl p-4 shadow-sm relative overflow-hidden">
                <div className="absolute inset-y-0 left-0 w-1 bg-emerald-500 rounded-l-xl" />
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Security Status</p>
                    <div className="mt-1.5">
                      {compromisedSessions.length > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                          <ShieldAlert className="w-4 h-4" />
                          {compromisedSessions.length} alert{compromisedSessions.length > 1 ? "s" : ""}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="w-4 h-4" />
                          Secure
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-950 rounded-lg">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
              </div>
            </div>

            {/* Compromised Sessions */}
            {compromisedSessions.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  Security Alerts
                </h2>
                <div className="space-y-3">
                  {compromisedSessions.map((session) => (
                    <div
                      key={session.session_uuid}
                      className="bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl shadow-sm overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-4 p-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div className="p-2.5 bg-red-100 dark:bg-red-900 rounded-lg shrink-0">
                            {getDeviceIcon(session.device_type, "w-5 h-5 text-red-600 dark:text-red-400")}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold text-sm text-red-900 dark:text-red-200">
                                {session.device_name ?? "Unknown Device"}
                              </p>
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300 border border-red-200 dark:border-red-700">
                                <ShieldAlert className="w-3 h-3" />
                                Compromised
                              </span>
                            </div>
                            <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                              {session.compromise_reason ?? "Security threat detected"}
                            </p>
                            {session.compromised_at && (
                              <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                Detected {session.compromised_at}
                              </p>
                            )}
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setConfirmDelete(session.session_uuid)}
                              className="p-2 rounded-lg bg-red-100 dark:bg-red-900 hover:bg-red-200 dark:hover:bg-red-800 transition-colors shrink-0"
                            >
                              <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Delete session</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Current Session */}
            {currentSession && (
              <section>
                <h2 className="text-sm font-semibold text-foreground mb-3">Current Session</h2>
                <div className="bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0 flex-1">
                        <div className="p-3 bg-primary/10 rounded-xl shrink-0">
                          {getDeviceIcon(currentSession.device_type, "w-5 h-5 text-primary")}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold text-sm">
                              {currentSession.device_name ?? "Unknown Device"}
                            </h3>
                            {getStatusBadge(currentSession.status, currentSession.compromised)}
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800">
                              <CheckCircle className="w-3 h-3" />
                              Current
                            </span>
                            {currentSession.remember_me && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800">
                                <Fingerprint className="w-3 h-3" />
                                Remembered
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => logout()}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-medium rounded-lg border border-border text-muted-foreground hover:text-destructive hover:border-destructive/30 hover:bg-destructive/5 transition-colors shrink-0"
                          >
                            <LogOut className="w-3.5 h-3.5" />
                            Sign Out
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Sign out from this device</TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                  <div className="border-t border-border/40 bg-muted/30 px-5 py-3">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Browser</p>
                        <p className="text-sm font-medium">{currentSession.browser ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">OS</p>
                        <p className="text-sm font-medium">{currentSession.operating_system ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Device Type</p>
                        <p className="text-sm font-medium capitalize">{currentSession.device_type ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">IP Address</p>
                        <p className="text-sm font-medium font-mono">{currentSession.ip_address ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Signed In</p>
                        <p className="text-sm font-medium">{currentSession.created_at ?? "—"}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-0.5">Last Active</p>
                        <p className="text-sm font-medium">{lastActivity}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Other Sessions */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground">
                  Other Devices
                </h2>
                <span className="text-xs text-muted-foreground">
                  {otherSessions.filter((s) => s.status === "active").length} active
                </span>
              </div>

              {otherSessions.length === 0 ? (
                <div className="bg-card border border-border/60 rounded-xl p-8 text-center">
                  <div className="p-3 bg-muted rounded-full w-fit mx-auto mb-3">
                    <Monitor className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <p className="font-medium text-sm">No other devices found</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your account is only signed in on this device.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {otherSessions.map((session) => (
                    <div
                      key={session.session_uuid}
                      className="bg-card border border-border/60 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className={`p-2.5 rounded-lg shrink-0 ${
                              session.status === "active" && !session.compromised
                                ? "bg-emerald-50 dark:bg-emerald-950"
                                : session.compromised
                                ? "bg-red-50 dark:bg-red-950"
                                : "bg-muted"
                            }`}>
                              {getDeviceIcon(session.device_type, `w-5 h-5 ${
                                session.status === "active" && !session.compromised
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : session.compromised
                                  ? "text-red-500"
                                  : "text-muted-foreground"
                              }`)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-medium text-sm truncate max-w-[200px]">
                                  {session.device_name ?? "Unknown Device"}
                                </h3>
                                {getStatusBadge(session.status, session.compromised)}
                                {session.remember_me && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800">
                                    <Fingerprint className="w-3 h-3" />
                                    Remembered
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  {session.browser && (
                                    <Terminal className="w-3.5 h-3.5 shrink-0" />
                                  )}
                                  {session.browser && session.operating_system
                                    ? `${session.browser} on ${session.operating_system}`
                                    : session.browser || session.operating_system || "Unknown"}
                                </span>
                                {session.ip_address && (
                                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                    <Globe className="w-3.5 h-3.5" />
                                    {session.ip_address}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                  <UserCheck className="w-3 h-3" />
                                  Signed in {session.created_at ?? "Unknown"}
                                </span>
                                <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                  <Activity className="w-3 h-3" />
                                  Last active {session.last_activity_at ?? "Unknown"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {session.status === "active" && !session.compromised && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setConfirmRevoke(session.session_uuid)}
                                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                                  >
                                    <LogOut className="w-4 h-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Sign out this device</TooltipContent>
                              </Tooltip>
                            )}
                            {(session.status === "revoked" || session.compromised) && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setConfirmDelete(session.session_uuid)}
                                    className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Delete session permanently</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Activity Timeline */}
            <section>
              <h2 className="text-sm font-semibold text-foreground mb-3">Recent Security Activity</h2>
              {securityActivityLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : securityActivity.length === 0 ? (
                <div className="bg-card border border-border/60 rounded-xl p-6 text-center">
                  <p className="text-xs text-muted-foreground">No recent security activity.</p>
                </div>
              ) : (
                <div className="bg-card border border-border/60 rounded-xl divide-y divide-border">
                  {securityActivity.slice(0, 10).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3.5">
                      <div className="p-1.5 bg-muted rounded-full shrink-0">
                        {activity.event_type === "login" && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />}
                        {activity.event_type === "logout" && <LogOut className="w-3.5 h-3.5 text-muted-foreground" />}
                        {activity.event_type === "refresh" && <RefreshCw className="w-3.5 h-3.5 text-blue-500" />}
                        {activity.event_type === "session_revoked" && <Ban className="w-3.5 h-3.5 text-amber-500" />}
                        {activity.event_type === "session_compromised" && <ShieldAlert className="w-3.5 h-3.5 text-red-500" />}
                        {activity.event_type === "refresh_token_reuse_detected" && <ShieldAlert className="w-3.5 h-3.5 text-red-500" />}
                        {!["login", "logout", "refresh", "session_revoked", "session_compromised", "refresh_token_reuse_detected"].includes(activity.event_type) && (
                          <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium">
                          {formatEventType(activity.event_type)}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {activity.created_at ?? "Unknown time"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        </main>
      </div>
    </>
  );
}

function formatEventType(type: string): string {
  const map: Record<string, string> = {
    login: "Logged in",
    logout: "Signed out",
    refresh: "Session refreshed",
    session_revoked: "Session revoked",
    session_compromised: "Session compromised",
    refresh_token_reuse_detected: "Refresh token reuse detected",
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
