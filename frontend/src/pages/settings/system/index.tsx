import { useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import {
    Settings2,
    Save,
    Loader2,
    ShieldCheck,
    AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useJwtAuth } from "@/hooks/useJwtAuth";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import IndexHeader from "@/components/IndexHeader";
import PageLayout from "@/components/PageLayout";
import { Form, createFormStore, useForm } from "@/components/ui/form";

const schema = z.object({
    secop_limit_per_client: z.string(),
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

export default function SystemSettings() {
    useDocumentTitle("System Settings");
    const { user, isLoading: authLoading } = useJwtAuth();
    const navigate = useNavigate();

    const { data: settings, isLoading } = useSettings();
    const updateSettings = useUpdateSettings();

    const store = useMemo(
        () => createFormStore({
            schema,
            originalData: { secop_limit_per_client: "2" },
            initialMode: "edit",
        }),
        [],
    );

    const mode = useForm(store, (s) => s.mode);

    // Guard: ensure user is authenticated via UUID
    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/settings", { replace: true });
        }
    }, [user, authLoading, navigate]);

    // Populate from server
    useEffect(() => {
        if (settings) {
            store.set("secop_limit_per_client")(settings.secop_limit_per_client);
        }
    }, [settings, store]);

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
                icon={Settings2}
                title="System Settings"
                description="Global configuration for the monitoring system."
                trail={[
                    { label: "Settings", href: "/settings" },
                    { label: "System Settings" },
                ]}
            />

            <SystemSettingsContent
                store={store}
                updateSettings={updateSettings}
                settings={settings}
            />
        </PageLayout>
    );
}

function SystemSettingsContent({
    store,
    updateSettings,
    settings,
}: {
    store: ReturnType<typeof createFormStore>;
    updateSettings: ReturnType<typeof useUpdateSettings>;
    settings: any;
}) {
    const form = useForm(store, (s) => s.form as z.infer<typeof schema>);
    const hasChanges = useForm(store, (s) => s.hasChanges);

    const limitParsed = parseInt(form.secop_limit_per_client, 10);
    const isValid = !isNaN(limitParsed) && limitParsed >= 1 && limitParsed <= 50;

    return (
        <Form.Root store={store}>
            {hasChanges && (
                <div className="flex justify-end">
                    <Form.Button
                        type="submit"
                        icon={
                            updateSettings.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Save className="w-3.5 h-3.5" />
                            )
                        }
                        disabled={updateSettings.isPending || !isValid}
                    >
                        {updateSettings.isPending ? "Saving…" : "Save Changes"}
                    </Form.Button>
                </div>
            )}

            <Form.SubmitHandler
                    handler={async (data: Record<string, unknown>) => {
                        const limit = parseInt(String(data.secop_limit_per_client), 10);
                        if (isNaN(limit) || limit < 1 || limit > 50) {
                            toast.error("SecOps limit must be a number between 1 and 50.");
                            return;
                        }
                        try {
                            await updateSettings.mutateAsync({
                                secop_limit_per_client: String(limit),
                            });
                            toast.success("System settings saved.");
                        } catch {
                            toast.error("Failed to save settings.");
                        }
                    }}
                />

                {/* Body */}
                <main className="py-8 flex-1">
                    <div className="max-w-2xl mx-auto px-6 sm:px-8 lg:px-10 flex flex-col gap-6">
                        {/* Section: SecOps */}
                        <div className="bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden">
                            <div className="flex items-center gap-3 px-6 py-4 border-b border-border/60 bg-muted/30">
                                <div className="p-1.5 bg-primary/10 rounded-md">
                                    <ShieldCheck className="w-4 h-4 text-primary" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">
                                        SecOps Assignments
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Controls how many SecOps personnel can be
                                        assigned per client.
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
                                            value={form.secop_limit_per_client}
                                            onChange={(e) =>
                                                store.set("secop_limit_per_client")(e.target.value)
                                            }
                                            className="w-20 h-9 rounded-md border border-border bg-background px-3 text-sm text-center font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                                        />
                                        <span className="text-xs text-muted-foreground">
                                            users
                                        </span>
                                    </div>
                                </SettingRow>
                            </div>
                        </div>

                        {/* Info banner */}
                        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                            <p className="text-xs leading-relaxed">
                                Reducing the SecOps limit below the current
                                assignment count for existing clients does not
                                automatically remove existing SecOps. It only
                                prevents new assignments that exceed the new limit.
                                Changes to monitoring settings take effect on the
                                next sync cycle.
                            </p>
                        </div>

                        {/* Floating save (mobile) */}
                        {hasChanges && (
                            <div className="sm:hidden">
                                <Form.Button
                                    type="submit"
                                    icon={<Save className="w-3.5 h-3.5" />}
                                    disabled={updateSettings.isPending || !isValid}
                                    className="w-full"
                                >
                                    {updateSettings.isPending ? "Saving…" : "Save Changes"}
                                </Form.Button>
                            </div>
                        )}
                    </div>
                </main>
            </Form.Root>
    );
}
