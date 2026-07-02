import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Save, ChevronLeft, Loader2, BellRing, Server } from "lucide-react";
import { toast } from "sonner";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { useJwtAuth } from "@/hooks/useJwtAuth";
import { useGlobalAlerts, useUpdateGlobalAlerts } from "@/hooks/useGlobalAlerts";
import type { GlobalAlert } from "@/hooks/useGlobalAlerts";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";

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
        <div className="flex flex-col gap-3 py-5">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
            </div>
            <div>{children}</div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlertThresholds() {
    const { user, isLoading: authLoading } = useJwtAuth();
    const { setTrail } = useBreadcrumb();
    const navigate = useNavigate();

    const { data: alerts, isLoading } = useGlobalAlerts();
    const updateAlerts = useUpdateGlobalAlerts();

    // Local state for thresholds { [metric_channel]: threshold }
    const [localAlerts, setLocalAlerts] = useState<Record<string, string | number>>({});
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
            { label: "Alert Thresholds", href: "/settings/thresholds" },
        ]);
    }, [setTrail]);

    // Populate from server
    useEffect(() => {
        if (alerts && Array.isArray(alerts)) {
            const newLocalAlerts: Record<string, number> = {};
            alerts.forEach(alert => {
                newLocalAlerts[`${alert.metric}_${alert.notification_channel}`] = alert.threshold;
            });
            setLocalAlerts(newLocalAlerts);
            setIsDirty(false);
        }
    }, [alerts]);

    const handleThresholdChange = (
        metric: string,
        channel: string,
        value: string
    ) => {
        // digits only
        let digits = value.replace(/\D/g, "");

        // remove leading zeros
        digits = digits.replace(/^0+(?=\d)/, "");

        let number = digits === "" ? 0 : Number(digits);

        if (number > 100) number = 100;

        setLocalAlerts((prev) => ({
            ...prev,
            [`${metric}_${channel}`]: number,
        }));

        setIsDirty(true);
    };

    const handleSave = async () => {
        const alertsToUpdate: GlobalAlert[] = [];

        // Validate
        for (const [key, val] of Object.entries(localAlerts)) {
            const lastUnderscore = key.lastIndexOf("_");

            const metric = key.substring(0, lastUnderscore);
            const channel = key.substring(lastUnderscore + 1);

            alertsToUpdate.push({
                metric,
                notification_channel: channel,
                threshold: Number(val),
            });
        }

        try {
            await updateAlerts.mutateAsync({ alerts: alertsToUpdate });

            // Format any empty values to 0 in local state to match what was saved
            setLocalAlerts(prev => {
                const formatted = { ...prev };
                for (const key in formatted) {
                    if (formatted[key] === "") {
                        formatted[key] = 0;
                    }
                }
                return formatted;
            });

            setIsDirty(false);
            toast.success("Alert thresholds saved.");
        } catch {
            toast.error("Failed to save thresholds.");
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading thresholds…</p>
            </div>
        );
    }

    const renderMetricSection = (metricId: string, metricLabel: string, description: string, icon: React.ReactNode) => {
        const emailValue = localAlerts[`${metricId}_email`] !== undefined ? localAlerts[`${metricId}_email`] : 80;
        const smsValue = localAlerts[`${metricId}_sms`] !== undefined ? localAlerts[`${metricId}_sms`] : 90;

        return (
            <div className="bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden h-full flex flex-col" key={metricId}>
                <div className="flex items-center gap-3 px-6 py-4 border-b border-border/60 bg-muted/30">
                    <div className="p-1.5 bg-primary/10 rounded-md">
                        {icon}
                    </div>
                    <div>
                        <p className="text-sm font-semibold">{metricLabel}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {description}
                        </p>
                    </div>
                </div>

                <div className="px-6 divide-y divide-border/50">
                    <SettingRow
                        label="Email Alert Threshold"
                        description="Percentage required to trigger an email notification."
                    >
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                inputMode="numeric"
                                value={emailValue}
                                onKeyDown={(e) => {
                                    if ([".", ",", "e", "E", "+", "-"].includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}
                                onChange={(e) =>
                                    handleThresholdChange(metricId, "email", e.target.value)
                                }
                                className="w-20 h-9 rounded-md border border-border bg-background px-3 text-sm text-center font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                        </div>
                    </SettingRow>

                    <SettingRow
                        label="SMS Alert Threshold"
                        description="Percentage required to trigger a critical SMS notification."
                    >
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                min={0}
                                max={100}
                                value={smsValue}
                                onChange={(e) => handleThresholdChange(metricId, 'sms', e.target.value)}
                                className="w-20 h-9 rounded-md border border-border bg-background px-3 text-sm text-center font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                            />
                            <span className="text-xs text-muted-foreground">%</span>
                        </div>
                    </SettingRow>
                </div>
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
                        className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        aria-label="Back to Settings"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                            <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-semibold tracking-tight">Alert Thresholds</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Configure when alerts are sent based on server metrics.
                            </p>
                        </div>
                    </div>
                    {isDirty && (
                        <div className="hidden sm:block">
                            <Button
                                label={updateAlerts.isPending ? "Saving…" : "Save Changes"}
                                icon={updateAlerts.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                                disabled={updateAlerts.isPending}
                                onClick={handleSave}
                            />
                        </div>
                    )}
                </div>
            </header>

            {/* Body */}
            <main className="py-8 flex-1">
                <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-4">
                        <div>
                            {renderMetricSection('cpu_usage', 'CPU Usage', 'Alerts when average CPU utilization stays above this threshold.', <Activity className="w-4 h-4 text-primary" />)}
                        </div>
                        <div>
                            {renderMetricSection('ram_usage', 'RAM Usage', 'Alerts when memory usage exceeds this percentage of total capacity.', <Server className="w-4 h-4 text-primary" />)}
                        </div>
                        <div>
                            {renderMetricSection('storage', 'Storage', 'Alerts when disk space reaches this capacity.', <BellRing className="w-4 h-4 text-primary" />)}
                        </div>
                    </div>

                    {/* Floating Save Button (FAB) for mobile/small screens */}
                    {isDirty && (
                        <div className="sm:hidden fixed bottom-6 right-6 z-50">
                            <button
                                onClick={handleSave}
                                disabled={updateAlerts.isPending}
                                className="flex items-center justify-center w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:shadow-xl hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                aria-label="Save Changes"
                            >
                                {updateAlerts.isPending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                            </button>
                        </div>
                    )}
                </div>
            </main>
        </PageLayout>
    );
}
