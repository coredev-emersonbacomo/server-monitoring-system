import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Settings2, Save, ChevronLeft, Loader2, ShieldCheck, AlertTriangle, Radio } from "lucide-react";
import { toast } from "sonner";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { useJwtAuth } from "@/hooks/useJwtAuth";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { Button } from "@/components/ui/button";
import PageLayout from "@/components/PageLayout";

// ─── Settings field wrapper ───────────────────────────────────────────────────

function SettingRow({
    label,
    description,
    children,
}: {
    label: string;
    description: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex items-start justify-between gap-6 py-5">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SystemSettings() {
    const { user, isLoading: authLoading } = useJwtAuth();
    const { setTrail } = useBreadcrumb();
    const navigate = useNavigate();

    const { data: settings, isLoading } = useSettings();
    const updateSettings = useUpdateSettings();

    const [limitValue, setLimitValue] = useState<string>("2");
    const [heartbeatValue, setHeartbeatValue] = useState<string>("5");
    const [offlineValue, setOfflineValue] = useState<string>("5");
    const [isDirty, setIsDirty] = useState(false);

    // Guard: ensure user is authenticated via UUID
    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/settings", { replace: true });
        }
    }, [user, authLoading, navigate]);

    useEffect(() => {
        setTrail([
            { label: "Settings", href: "/settings" },
            { label: "System Settings" },
        ]);
    }, [setTrail]);

    // Populate from server
    useEffect(() => {
        if (settings) {
            setLimitValue(settings.secop_limit_per_client);
            setHeartbeatValue(settings.heartbeat_interval);
            setOfflineValue(settings.offline_threshold);
            setIsDirty(false);
        }
    }, [settings]);

    const hasChanges = useMemo(() => {
        if (!settings) return false;
        return (
            limitValue !== settings.secop_limit_per_client ||
            heartbeatValue !== settings.heartbeat_interval ||
            offlineValue !== settings.offline_threshold
        );
    }, [limitValue, heartbeatValue, offlineValue, settings]);

    useEffect(() => {
        setIsDirty(hasChanges);
    }, [hasChanges]);

    const heartbeatNum = parseInt(heartbeatValue, 10);
    const offlineNum = parseInt(offlineValue, 10);
    const heartbeatBelowOffline = !isNaN(heartbeatNum) && !isNaN(offlineNum) && heartbeatNum < offlineNum;

    const handleSave = async () => {
        const limitParsed = parseInt(limitValue, 10);
        const heartbeatParsed = parseInt(heartbeatValue, 10);
        const offlineParsed = parseInt(offlineValue, 10);

        if (isNaN(limitParsed) || limitParsed < 1 || limitParsed > 50) {
            toast.error("SecOps limit must be a number between 1 and 50.");
            return;
        }
        if (isNaN(heartbeatParsed) || heartbeatParsed < 1 || heartbeatParsed > 60) {
            toast.error("Heartbeat interval must be between 1 and 60 minutes.");
            return;
        }
        if (isNaN(offlineParsed) || offlineParsed < 1 || offlineParsed > 60) {
            toast.error("Offline threshold must be between 1 and 60 minutes.");
            return;
        }
        if (heartbeatParsed < offlineParsed) {
            toast.error("Heartbeat interval must be greater than or equal to the offline threshold.");
            return;
        }

        try {
            await updateSettings.mutateAsync({
                secop_limit_per_client: String(limitParsed),
                heartbeat_interval: String(heartbeatParsed),
                offline_threshold: String(offlineParsed),
            });
            setLimitValue(String(limitParsed));
            setHeartbeatValue(String(heartbeatParsed));
            setOfflineValue(String(offlineParsed));
            setIsDirty(false);
            toast.success("System settings saved.");
        } catch {
            toast.error("Failed to save settings.");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading settings…</p>
            </div>
        );
    }

    return (
        <PageLayout>
            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
                <div className="flex items-center gap-4 py-3 px-6 sm:px-8 lg:px-10">
                    <button
                        onClick={() => navigate("/settings")}
                        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground cursor-pointer"
                        aria-label="Back to Settings"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                            <Settings2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight">System Settings</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Global configuration for the monitoring system.
                            </p>
                        </div>
                    </div>
                    {isDirty && (
                        <Button
                            label={updateSettings.isPending ? "Saving…" : "Save Changes"}
                            icon={updateSettings.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                            disabled={updateSettings.isPending}
                            onClick={handleSave}
                        />
                    )}
                </div>
            </header>

            {/* Body */}
            <main className="py-8 flex-1">
                <div className="max-w-2xl mx-auto px-6 sm:px-8 lg:px-10 flex flex-col gap-6">

                    {/* Section: Monitoring */}
                    <div className="bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/60 bg-muted/30">
                            <div className="p-1.5 bg-primary/10 rounded-md">
                                <Radio className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Monitoring</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Configure how agents communicate and when servers are considered offline.
                                </p>
                            </div>
                        </div>

                        <div className="px-6 divide-y divide-border/50">
                            <SettingRow
                                label="Heartbeat Interval"
                                description="How often agents send heartbeats to the server (in minutes). Must be greater than or equal to the offline threshold."
                            >
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={1}
                                        max={60}
                                        value={heartbeatValue}
                                        onChange={(e) => setHeartbeatValue(e.target.value)}
                                        className="w-20 h-9 rounded-md border border-border bg-background px-3 text-sm text-center font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                                    />
                                    <span className="text-xs text-muted-foreground">min</span>
                                </div>
                            </SettingRow>

                            <SettingRow
                                label="Offline Threshold"
                                description="Minutes without a heartbeat before a server is marked as offline."
                            >
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={1}
                                        max={60}
                                        value={offlineValue}
                                        onChange={(e) => setOfflineValue(e.target.value)}
                                        className="w-20 h-9 rounded-md border border-border bg-background px-3 text-sm text-center font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                                    />
                                    <span className="text-xs text-muted-foreground">min</span>
                                </div>
                            </SettingRow>
                        </div>
                    </div>

                    {/* Validation warning */}
                    {heartbeatBelowOffline && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-500/5 border border-red-500/20 text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <p className="text-xs leading-relaxed">
                                Heartbeat interval ({heartbeatValue} min) must be greater than or equal to the offline threshold ({offlineValue} min).
                            </p>
                        </div>
                    )}

                    {/* Section: SecOps */}
                    <div className="bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/60 bg-muted/30">
                            <div className="p-1.5 bg-primary/10 rounded-md">
                                <ShieldCheck className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">SecOps Assignments</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Controls how many SecOps personnel can be assigned per client.
                                </p>
                            </div>
                        </div>

                        <div className="px-6 divide-y divide-border/50">
                            <SettingRow
                                label="SecOps Limit Per Client"
                                description="Maximum number of SecOps users that can be assigned to a single client. Minimum 1, maximum 50."
                            >
                                <div className="flex items-center gap-2">
                                    <input
                                        id="secop-limit-input"
                                        type="number"
                                        min={1}
                                        max={50}
                                        value={limitValue}
                                        onChange={(e) => setLimitValue(e.target.value)}
                                        className="w-20 h-9 rounded-md border border-border bg-background px-3 text-sm text-center font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                                    />
                                    <span className="text-xs text-muted-foreground">users</span>
                                </div>
                            </SettingRow>
                        </div>
                    </div>

                    {/* Info banner */}
                    <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                        <p className="text-xs leading-relaxed">
                            Reducing the SecOps limit below the current assignment count for existing clients
                            does not automatically remove existing SecOps. It only prevents new assignments
                            that exceed the new limit. Changes to monitoring settings take effect on the next sync cycle.
                        </p>
                    </div>

                    {/* Floating save (mobile) */}
                    {isDirty && (
                        <div className="sm:hidden">
                            <Button
                                label={updateSettings.isPending ? "Saving…" : "Save Changes"}
                                icon={<Save className="w-3.5 h-3.5" />}
                                disabled={updateSettings.isPending}
                                onClick={handleSave}
                                className="w-full"
                            />
                        </div>
                    )}
                </div>
            </main>
        </PageLayout>
    );
}
