import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Save, ChevronLeft, Loader2, BellRing, Server } from "lucide-react";
import { toast } from "sonner";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import { useJwtAuth } from "@/hooks/useJwtAuth";
import { useGlobalAlerts, useUpdateGlobalAlerts } from "@/hooks/useGlobalAlerts";
import type { GlobalAlert } from "@/hooks/useGlobalAlerts";
import MetricCard from "@/components/thresholds/MetricCard";
import type {
    NotificationLevel,
    NotificationSeverity,
} from "@/components/thresholds/types";
import PageLayout from "@/components/PageLayout";
import { Button } from "@/components/ui/button";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AlertThresholds() {
    const { user, isLoading: authLoading } = useJwtAuth();
    const { setTrail } = useBreadcrumb();
    const navigate = useNavigate();

    const { data: alerts, isLoading } = useGlobalAlerts();
    const updateAlerts = useUpdateGlobalAlerts();

    // Local state for thresholds { [metric_channel]: threshold }

    const [metrics, setMetrics] = useState<
        Record<string, NotificationLevel[]>
    >({});

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
        if (!alerts) return;

        const grouped: Record<
            string,
            NotificationLevel[]
        > = {};

        alerts.forEach((alert) => {
            if (!grouped[alert.metric]) {
                grouped[alert.metric] = [];
            }
        
            grouped[alert.metric].push({
                id: String(alert.id),
                name: alert.name,
                threshold: alert.threshold,
                severity: alert.severity,
                channels: alert.channels,
            });
        });

        setMetrics(grouped);

        setIsDirty(false);
    }, [alerts]);

    const handleMetricSave = (
        metricId: string,
        levels: NotificationLevel[]
    ) => {
        setMetrics((prev) => ({
            ...prev,
            [metricId]: levels,
        }));

        setIsDirty(true);
    };

    const handleSave = async () => {
        const alertsToUpdate = [];
    
        Object.entries(metrics).forEach(([metric, levels]) => {
            levels.forEach((level) => {
                alertsToUpdate.push({
                    metric,
                    name: level.name,
                    threshold: level.threshold,
                    severity: level.severity,
                    channels: level.channels,
                    enabled: true,
                });
            });
        });
    
        try {
            await updateAlerts.mutateAsync({
                alerts: alertsToUpdate,
            });
    
            setIsDirty(false);
    
            toast.success("Alert thresholds updated.");
        } catch {
            toast.error("Failed to update thresholds.");
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

    const metricCards = [
        {
            id: "cpu_usage",
            title: "CPU Usage",
            description:
                "Alerts when average CPU utilization stays above this threshold.",
            icon: (
                <Activity className="w-4 h-4 text-primary" />
            ),
        },
        {
            id: "ram_usage",
            title: "RAM Usage",
            description:
                "Alerts when memory usage exceeds this percentage of total capacity.",
            icon: (
                <Server className="w-4 h-4 text-primary" />
            ),
        },
        {
            id: "storage",
            title: "Storage",
            description:
                "Alerts when disk space reaches this capacity.",
            icon: (
                <BellRing className="w-4 h-4 text-primary" />
            ),
        },
    ];



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
                    <div className="space-y-6 pb-4">
                        {metricCards.map((metric) => (
                            <MetricCard
                                key={metric.id}
                                metricId={metric.id}
                                title={metric.title}
                                description={metric.description}
                                icon={metric.icon}
                                levels={metrics[metric.id] ?? []}
                                onSave={handleMetricSave}
                            />
                        ))}
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
