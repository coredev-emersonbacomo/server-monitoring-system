import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    Cpu,
    Save,
    Loader2,
    AlertTriangle,
    Radio,
    Undo2,
    Redo2,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useJwtAuth } from "@/hooks/useJwtAuth";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import IndexHeader from "@/components/IndexHeader";
import PageLayout from "@/components/PageLayout";
import { DurationInput } from "@/components/node-config/nodes/DurationInput";
import { Form, createFormStore, useForm, type FormStore } from "@/components/ui/form";

const schema = z.object({
    heartbeat_interval: z.string(),
    offline_threshold: z.string(),
    port_ping_interval: z.string(),
});

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
                <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {description}
                </p>
            </div>
            <div className="shrink-0">{children}</div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentSettings() {
    const { user, isLoading: authLoading } = useJwtAuth();
    const navigate = useNavigate();

    const { data: settings, isLoading } = useSettings();
    const updateSettings = useUpdateSettings();

    // Guard: ensure user is authenticated via UUID
    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/settings", { replace: true });
        }
    }, [user, authLoading, navigate]);

    const store = useMemo(
        () => createFormStore({
            schema,
            originalData: settings
                ? {
                      heartbeat_interval: String(
                          parseInt(settings.heartbeat_interval, 10) >= 1000
                              ? Math.floor(parseInt(settings.heartbeat_interval, 10) / 1000)
                              : parseInt(settings.heartbeat_interval, 10) || 5
                      ),
                      offline_threshold: String(
                          parseInt(settings.offline_threshold, 10) >= 1000
                              ? Math.floor(parseInt(settings.offline_threshold, 10) / 1000)
                              : parseInt(settings.offline_threshold, 10) || 15
                      ),
                      port_ping_interval: String(
                          parseInt(settings.port_ping_interval, 10) >= 1000
                              ? Math.floor(parseInt(settings.port_ping_interval, 10) / 1000)
                              : parseInt(settings.port_ping_interval, 10) || 60
                      ),
                  }
                : { heartbeat_interval: "5", offline_threshold: "15", port_ping_interval: "60" },
            initialMode: "edit",
        }),
        [settings],
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh] gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                    Loading settings…
                </p>
            </div>
        );
    }

    return (
        <PageLayout>
            <IndexHeader
                icon={Cpu}
                title="Agent Settings"
                description="Configure monitoring agent intervals, version tracking, and updates."
                trail={[
                    { label: "Settings", href: "/settings" },
                    { label: "Agent Settings" },
                ]}
            />

            <AgentSettingsContent
                store={store}
                updateSettings={updateSettings}
                agentVersion={settings?.agent_version ?? "2.0"}
            />
        </PageLayout>
    );
}

type FormData = z.infer<typeof schema>;
function AgentSettingsContent<T extends FormData>({
    store,
    updateSettings,
    agentVersion,
}: {
    store: FormStore<T>;
    updateSettings: ReturnType<typeof useUpdateSettings>;
    agentVersion: string;
}) {
    const form = useForm(store, (s) => s.form);
    const hasChanges = useForm(store, (s) => s.hasChanges);

    const heartbeatValue = parseInt(form.heartbeat_interval, 10) || 0;
    const offlineValue = parseInt(form.offline_threshold, 10) || 0;
    const portPingValue = parseInt(form.port_ping_interval, 10) || 0;
    const offlineBelowHeartbeat = offlineValue < heartbeatValue;

    const isValid =
        heartbeatValue >= 1 && heartbeatValue <= 1000 &&
        offlineValue >= 1 && offlineValue <= 1000 &&
        offlineValue >= heartbeatValue &&
        portPingValue >= 1 && portPingValue <= 3600;

    return (
        <Form.Root store={store}>
            <div className="flex justify-end items-center mb-4">
                <Form.Button
                    type="submit"
                    icon={
                        updateSettings.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Save className="w-3.5 h-3.5" />
                        )
                    }
                    disabled={updateSettings.isPending || !isValid || !hasChanges}
                >
                    {updateSettings.isPending ? "Saving…" : "Save Changes"}
                </Form.Button>
            </div>

            <Form.SubmitHandler
                handler={async (data: Record<string, unknown>) => {
                    const hb = parseInt(String(data.heartbeat_interval), 10);
                    const off = parseInt(String(data.offline_threshold), 10);
                    const pp = parseInt(String(data.port_ping_interval), 10);

                    if (isNaN(hb) || hb < 1 || hb > 1000) {
                        toast.error("Heartbeat interval must be between 1s and ~16m.");
                        return;
                    }
                    if (isNaN(off) || off < 1 || off > 1000) {
                        toast.error("Offline threshold must be between 1s and ~16m.");
                        return;
                    }
                    if (off < hb) {
                        toast.error("Offline threshold must be greater than or equal to the heartbeat interval.");
                        return;
                    }
                    if (isNaN(pp) || pp < 1 || pp > 3600) {
                        toast.error("Port ping interval must be between 1s and 1h.");
                        return;
                    }

                    try {
                        await updateSettings.mutateAsync({
                            heartbeat_interval: String(hb),
                            offline_threshold: String(off),
                            port_ping_interval: String(pp),
                        });
                        toast.success("Agent settings saved.");
                    } catch {
                        toast.error("Failed to save agent settings.");
                    }
                }}
            />

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
                                <p className="text-sm font-semibold">
                                    Heartbeat & Status Checks
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Configure how often agents report back and
                                    when they are deemed offline.
                                </p>
                            </div>
                        </div>

                        <div className="px-6 divide-y divide-border/50">
                            <SettingRow
                                label="Heartbeat Interval"
                                description="How often agents send heartbeats to the server. Must be less than or equal to the offline threshold."
                            >
                                <DurationInput
                                    label=""
                                    value={heartbeatValue * 1000}
                                    onChange={(ms) => {
                                        const secs = Math.max(1, Math.round(ms / 1000));
                                        store.set("heartbeat_interval")(String(secs));
                                    }}
                                    placeholder="5s"
                                />
                            </SettingRow>

                            <SettingRow
                                label="Offline Threshold"
                                description="Time without a heartbeat before a server is marked as offline. Must be greater than or equal to the heartbeat interval."
                            >
                                <DurationInput
                                    label=""
                                    value={offlineValue * 1000}
                                    onChange={(ms) => {
                                        const secs = Math.max(1, Math.round(ms / 1000));
                                        store.set("offline_threshold")(String(secs));
                                    }}
                                    placeholder="15s"
                                />
                            </SettingRow>

                            <SettingRow
                                label="Port Ping Interval"
                                description="How often the backend TCP-pings the server's exposed ports. Results show in the server details port list and drive port ping alerts."
                            >
                                <DurationInput
                                    label=""
                                    value={portPingValue * 1000}
                                    onChange={(ms) => {
                                        const secs = Math.max(1, Math.round(ms / 1000));
                                        store.set("port_ping_interval")(String(secs));
                                    }}
                                    placeholder="60s"
                                />
                            </SettingRow>
                        </div>
                    </div>

                    {/* Validation warning */}
                    {offlineBelowHeartbeat && (
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-500/5 border border-red-500/20 text-red-600 dark:text-red-400">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <p className="text-xs leading-relaxed">
                                Offline threshold ({offlineValue}s) must
                                be greater than or equal to the heartbeat
                                interval ({heartbeatValue}s).
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
                                <p className="text-sm font-semibold">
                                    Agent Update Control
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Set the latest agent binary version.
                                    Outdated agents will download the new binary
                                    and self-update.
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
                                        value={agentVersion}
                                        className="w-32 h-9 rounded-md border border-border bg-muted/50 px-3 text-sm text-left font-medium text-muted-foreground cursor-not-allowed focus:outline-none"
                                    />
                                </div>
                            </SettingRow>
                        </div>
                    </div>
                </div>
            </main>
        </Form.Root>
    );
}
