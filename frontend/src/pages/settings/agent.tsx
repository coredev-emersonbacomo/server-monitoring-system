import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Cpu, Save, ChevronLeft, Loader2, AlertTriangle, Radio } from "lucide-react";
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

export default function AgentSettings() {
    const { user, isLoading: authLoading } = useJwtAuth();
    const { setTrail } = useBreadcrumb();
    const navigate = useNavigate();

    const { data: settings, isLoading } = useSettings();
    const updateSettings = useUpdateSettings();

    const [heartbeatValue, setHeartbeatValue] = useState<string>("5");
    const [offlineValue, setOfflineValue] = useState<string>("15");
    const [versionValue, setVersionValue] = useState<string>("2.0");
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
            { label: "Agent Settings" },
        ]);
    }, [setTrail]);

    // Populate from server
    useEffect(() => {
        if (settings) {
            setHeartbeatValue(settings.heartbeat_interval);
            setOfflineValue(settings.offline_threshold);
            setVersionValue(settings.agent_version);
            setIsDirty(false);
        }
    }, [settings]);

    const hasChanges = useMemo(() => {
        if (!settings) return false;
        return (
            heartbeatValue !== settings.heartbeat_interval ||
            offlineValue !== settings.offline_threshold ||
            versionValue !== settings.agent_version
        );
    }, [heartbeatValue, offlineValue, versionValue, settings]);

    useEffect(() => {
        setIsDirty(hasChanges);
    }, [hasChanges]);

    const heartbeatNum = parseInt(heartbeatValue, 10);
    const offlineNum = parseInt(offlineValue, 10);
    const heartbeatBelowOffline = !isNaN(heartbeatNum) && !isNaN(offlineNum) && heartbeatNum < offlineNum;

    const handleSave = async () => {
        const heartbeatParsed = parseInt(heartbeatValue, 10);
        const offlineParsed = parseInt(offlineValue, 10);

        if (isNaN(heartbeatParsed) || heartbeatParsed < 1 || heartbeatParsed > 1000) {
            toast.error("Heartbeat interval must be between 1 and 1000 seconds.");
            return;
        }
        if (isNaN(offlineParsed) || offlineParsed < 1 || offlineParsed > 1000) {
            toast.error("Offline threshold must be between 1 and 1000 seconds.");
            return;
        }
        if (heartbeatParsed < offlineParsed) {
            toast.error("Heartbeat interval must be greater than or equal to the offline threshold.");
            return;
        }
        if (!versionValue.trim()) {
            toast.error("Agent version cannot be empty.");
            return;
        }

        try {
            await updateSettings.mutateAsync({
                heartbeat_interval: String(heartbeatParsed),
                offline_threshold: String(offlineParsed),
                agent_version: versionValue.trim(),
            });
            setHeartbeatValue(String(heartbeatParsed));
            setOfflineValue(String(offlineParsed));
            setVersionValue(versionValue.trim());
            setIsDirty(false);
            toast.success("Agent settings saved.");
        } catch {
            toast.error("Failed to save agent settings.");
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
                            <Cpu className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight">Agent Settings</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Configure monitoring agent intervals, version tracking, and updates.
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
                                <p className="text-sm font-semibold">Heartbeat & Status Checks</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Configure how often agents report back and when they are deemed offline.
                                </p>
                            </div>
                        </div>

                        <div className="px-6 divide-y divide-border/50">
                            <SettingRow
                                label="Heartbeat Interval"
                                description="How often agents send heartbeats to the server (in seconds). Must be greater than or equal to the offline threshold."
                            >
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={1}
                                        value={heartbeatValue}
                                        onChange={(e) => setHeartbeatValue(e.target.value)}
                                        className="w-24 h-9 rounded-md border border-border bg-background px-3 text-sm text-center font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                                    />
                                    <span className="text-xs text-muted-foreground">sec</span>
                                </div>
                            </SettingRow>

                            <SettingRow
                                label="Offline Threshold"
                                description="Seconds without a heartbeat before a server is marked as offline."
                            >
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        min={1}
                                        value={offlineValue}
                                        onChange={(e) => setOfflineValue(e.target.value)}
                                        className="w-24 h-9 rounded-md border border-border bg-background px-3 text-sm text-center font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                                    />
                                    <span className="text-xs text-muted-foreground">sec</span>
                                </div>
                            </SettingRow>
                        </div>
                    </div>

                    {/* Validation warning */}
                    {heartbeatBelowOffline && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-500/5 border border-red-500/20 text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <p className="text-xs leading-relaxed">
                                Heartbeat interval ({heartbeatValue} sec) must be greater than or equal to the offline threshold ({offlineValue} sec).
                            </p>
                        </div>
                    )}

                    {/* Section: Agent Version Control */}
                    <div className="bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden">
                        <div className="flex items-center gap-3 px-6 py-4 border-b border-border/60 bg-muted/30">
                            <div className="p-1.5 bg-primary/10 rounded-md">
                                <Cpu className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Agent Update Control</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Set the latest agent binary version. Outdated agents will download the new binary and self-update.
                                </p>
                            </div>
                        </div>

                        <div className="px-6 divide-y divide-border/50">
                            <SettingRow
                                label="Latest Agent Version"
                                description="Changing this version number triggers self-update downloads on running agent binaries."
                            >
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={versionValue}
                                        className="w-32 h-9 rounded-md border border-border bg-muted/50 px-3 text-sm text-left font-medium text-muted-foreground cursor-not-allowed focus:outline-none"
                                    />
                                </div>
                            </SettingRow>
                        </div>
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
