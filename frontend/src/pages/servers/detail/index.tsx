import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import api from "@/api/api";
import {
    Info,
    BarChart3,
    Bell,
    Terminal,
    ArrowLeft,
    Loader2,
    Cpu,
    Server,
} from "lucide-react";

import PageLayout from "@/components/PageLayout";
import { ChartZoomProvider } from "@/contexts/ChartZoomContext";
import { Button } from "@/components/ui/button";
import { Tab } from "@/components/ui/tab";
import type { ProvisionDetailData } from "@/types/models";
import IndexHeader, { type Crumb } from "@/components/IndexHeader";
import { useServerSocket } from "@/hooks/useServerSocket";
import { toast } from "sonner";
import { createFormStore, useForm } from "@/components/ui/form";

import { useServer } from "./hooks/useServer";
import { useDeleteServer } from "./hooks/useDeleteServer";
import { useServerAlertTab } from "./hooks/useServerAlertTab";
import { STATUS_CONFIG } from "./constants/statusConfig";
import { serverInfoSchema } from "./types";
import type { TimeSpan } from "./types";

import {
    ServerDetailContext,
    type CopyKey,
    type ServerDetailServer,
} from "./context/ServerDetailContext";

import { AgentInstallationGuide } from "./components/AgentInstallationGuide";
import { ServerInfoTab } from "./tabs/ServerInfoTab";
import { MetricsTab } from "./tabs/MetricsTab";
import { AlertsTab } from "./tabs/AlertsTab";
import { AgentTab } from "./tabs/AgentTab";

export default function ServerDetail() {
    const { uuid } = useParams<{ uuid: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const allClient = searchParams.get("client") === "all";

    const [timeSpan, setTimeSpan] = useState<TimeSpan>("1H");

    // For Custom range
    const [customFrom, setCustomFrom] = useState<string>("");
    const [customTo, setCustomTo] = useState<string>("");
    const [customUnitStr, setCustomUnitStr] = useState<string>("auto");

    const timeSpanArgs = useMemo(() => {
        if (timeSpan === "Custom") {
            if (!customFrom || !customTo)
                return { subtract: "-1 hour", unit: 1 };

            const fromTime = new Date(customFrom).getTime();
            const toTime = new Date(customTo).getTime();
            const diffHours = (toTime - fromTime) / (1000 * 60 * 60);

            let minUnit = 1; // Minute
            if (diffHours > 24 * 365)
                minUnit = 5; // Month
            else if (diffHours > 24 * 31)
                minUnit = 4; // Week
            else if (diffHours > 48)
                minUnit = 3; // Day
            else if (diffHours > 2) minUnit = 2; // Hour

            let unit =
                customUnitStr === "auto"
                    ? minUnit
                    : parseInt(customUnitStr, 10);
            if (unit < minUnit) unit = minUnit;

            return {
                subtract: undefined,
                unit,
                minUnit,
                fromTime: new Date(customFrom).toISOString(),
                toTime: new Date(customTo).toISOString(),
            };
        }

        switch (timeSpan) {
            case "1H":
                return { subtract: "-1 hour", unit: 1 };
            case "1D":
                return { subtract: "-1 day", unit: 2 };
            case "1W":
                return { subtract: "-1 week", unit: 3 };
            case "1M":
                return { subtract: "-1 month", unit: 4 };
            case "3M":
                return { subtract: "-3 months", unit: 4 };
            case "6M":
                return { subtract: "-6 months", unit: 4 };
            case "1Y":
                return { subtract: "-1 year", unit: 5 };
            case "3Y":
                return { subtract: "-3 years", unit: 5 };
            case "6Y":
                return { subtract: "-6 years", unit: 5 };
            case "9Y":
                return { subtract: "-9 years", unit: 5 };
            case "12Y":
                return { subtract: "-12 years", unit: 5 };
        }
    }, [timeSpan, customFrom, customTo, customUnitStr]);

    const {
        data: initial,
        isLoading,
        isError,
    } = useServer(uuid!, {
        timeSubtract: timeSpanArgs?.subtract,
        timeUnit: timeSpanArgs?.unit,
        fromTime: (timeSpanArgs as any)?.fromTime,
        toTime: (timeSpanArgs as any)?.toTime,
    });

    const queryClient = useQueryClient();
    const serverAlertTab = useServerAlertTab(
        initial?.uuid ?? "",
        initial?.name ?? "Unknown",
        initial?.client_uuid ?? null,
        initial?.client_name ?? null,
        initial?.alert_scope,
    );
    const [provisionDetails, setProvisionDetails] =
        useState<ProvisionDetailData | null>(
            initial?.activeProvisionDetails ?? null,
        );
    const [generating, setGenerating] = useState(false);
    const [copiedKey, setCopiedKey] = useState<CopyKey | null>(null);
    const [timeLeft, setTimeLeft] = useState<string>("");

    const store = useMemo(
        () =>
            createFormStore({
                schema: serverInfoSchema,
                originalData: null,
                initialMode: "view",
            }),
        // Only recreate store when navigating to a different server, not on every poll
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [initial?.uuid],
    );

    const form = useForm(store, (s) => s.form);
    const mode = useForm(store, (s) => s.mode);

    // Populate form when server data first loads (uuid change) — never overwrite during active edit
    useEffect(() => {
        if (!initial) return;
        const data = {
            name: initial.name,
            description: initial.description ?? "",
            subscription_fee: initial.subscription_fee ?? 0,
        };
        store.setState({
            form: data,
            originalData: data,
            externalDirty: false,
        });
        store.setMode("view");
    // Only run when the server uuid changes (navigating to a different server)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initial?.uuid, store]);

    useEffect(() => {
        if (initial?.activeProvisionDetails) {
            setProvisionDetails(initial.activeProvisionDetails);
        }
    }, [initial?.activeProvisionDetails]);

    // Format remaining time for provision token
    useEffect(() => {
        if (!provisionDetails?.expires_at) return;
        const updateTimer = () => {
            const diff =
                new Date(provisionDetails.expires_at).getTime() - Date.now();
            if (diff <= 0) {
                setTimeLeft("Expired");
                setProvisionDetails(null);
            } else {
                const mins = Math.floor(diff / 60000);
                const secs = Math.floor((diff % 60000) / 1000);
                setTimeLeft(`(${mins}m ${secs}s remaining)`);
            }
        };
        updateTimer();
        const interval = setInterval(updateTimer, 1000);
        return () => clearInterval(interval);
    }, [provisionDetails?.expires_at]);

    const generateProvisionToken = async () => {
        if (!initial?.client_uuid) {
            toast.error("Missing client reference.");
            return;
        }
        setGenerating(true);
        try {
            const { data, error } = await api.POST(
                "/v1/servers/{uuid}/provision",
                {
                    params: {
                        path: {
                            uuid: initial.uuid,
                        },
                    },
                },
            );
            if (error) {
                toast.error("Failed to generate token.");
            } else {
                setProvisionDetails(data as unknown as ProvisionDetailData);
                toast.success("Provision token generated!");
                queryClient.invalidateQueries({ queryKey: ["server", uuid] });
            }
        } catch {
            toast.error("An error occurred.");
        } finally {
            setGenerating(false);
        }
    };

    const regenerateProvisionToken = async () => {
        if (!initial?.client_uuid) {
            toast.error("Missing client reference.");
            return;
        }
        setGenerating(true);
        try {
            const { data, error } = await api.POST(
                "/v1/servers/{uuid}/provision/regenerate",
                {
                    params: {
                        path: {
                            uuid: initial.uuid,
                        },
                    },
                },
            );
            if (error) {
                toast.error("Failed to regenerate token.");
            } else {
                setProvisionDetails(data as unknown as ProvisionDetailData);
                toast.success("Provision token regenerated!");
                queryClient.invalidateQueries({ queryKey: ["server", uuid] });
            }
        } catch {
            toast.error("An error occurred.");
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = (text: string, type: CopyKey) => {
        navigator.clipboard.writeText(text);
        setCopiedKey(type);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopiedKey(null), 2000);
    };

    useServerSocket(uuid!);

    const [confirmText, setConfirmText] = useState("");
    const deleteServer = useDeleteServer();
    const isConfirmed = confirmText.trim() === initial?.name;



    const handleDeletePort = useCallback(
        async (portId: number) => {
            if (!initial?.client_uuid) return;
            try {
                const { error } = await api.DELETE(
                    "/v1/clients/{clientUuid}/servers/{serverUuid}/ports/{portId}",
                    {
                        params: {
                            path: {
                                clientUuid: initial.client_uuid,
                                serverUuid: uuid!,
                                portId,
                            },
                        },
                    },
                );
                if (error) {
                    toast.error("Failed to delete port.");
                } else {
                    toast.success("Tracked port removed.");
                    queryClient.invalidateQueries({
                        queryKey: ["server", uuid],
                    });
                }
            } catch {
                toast.error("An error occurred.");
            }
        },
        [initial, uuid, queryClient],
    );

    if (isLoading) {
        return (
            <PageLayout title="Server Details">
                <div className="flex items-center justify-center min-h-100">
                    <Loader2 className="size-8 animate-spin text-primary" />
                </div>
            </PageLayout>
        );
    }

    if (isError || !initial) {
        return (
            <PageLayout title="Server Details">
                <div className="flex flex-col items-center justify-center min-h-100 gap-4">
                    <p className="text-muted-foreground">Server not found.</p>
                    <Button
                        variant="outline"
                        label="Back"
                        icon={<ArrowLeft size={16} />}
                        onClick={() =>
                            navigate(
                                allClient
                                    ? "/servers"
                                    : `/clients/${initial?.client_uuid ?? ""}`,
                            )
                        }
                    />
                </div>
            </PageLayout>
        );
    }

    const server: ServerDetailServer = initial;
    const trail: Crumb[] = allClient
        ? [{ label: "Servers", href: "/servers" }, { label: server.name }]
        : [
            { label: "Clients", href: "/clients" },
            {
                label: server.client_name ?? "Client",
                href: server.client_uuid
                    ? `/clients/${server.client_uuid}`
                    : undefined,
            },
            { label: server.name },
        ];
    const isArchived = server.record_status === "archived" || server.status === "archived";
    const statusKey = isArchived
        ? "archived"
        : server.agent_deleted
            ? "pending_deletion"
            : (server.status as keyof typeof STATUS_CONFIG) in STATUS_CONFIG
                ? (server.status as keyof typeof STATUS_CONFIG)
                : "pending_installation";

    const {
        label: statusLabel,
        icon: StatusIcon,
        color: statusColor,
        bg: statusBg,
    } = STATUS_CONFIG[statusKey];

    const isInstalled =
        statusKey === "online" ||
        statusKey === "warning" ||
        statusKey === "offline" ||
        statusKey === "waiting_for_first_heartbeat";

    const contextValue = {
        store,
        initial,
        server,
        mode,
        form,
        confirmText,
        setConfirmText,
        deleteServer,
        isConfirmed,
        allClient,
        navigate,
        copyToClipboard,
        serverAlertTab,
        handleDeletePort,
    };

    return (
        <ServerDetailContext.Provider value={contextValue}>
            <ChartZoomProvider>
                <PageLayout title={`${server.name} Details`}>
                    <IndexHeader
                        icon={Server}
                        title={server.name}
                        description={`Monitoring details and real-time metrics for ${server.name}`}
                        trail={trail}
                    />

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span
                            className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${statusBg} ${statusColor}`}
                        >
                            <StatusIcon size={14} />
                            {statusLabel}
                        </span>
                    </div>

                    <AgentInstallationGuide
                        status={statusKey}
                        provisionDetails={provisionDetails}
                        generating={generating}
                        copiedKey={copiedKey}
                        timeLeft={timeLeft}
                        generateProvisionToken={generateProvisionToken}
                        regenerateProvisionToken={regenerateProvisionToken}
                        copyToClipboard={copyToClipboard}
                    />

                    <div>
                        <Tab>
                            <Tab.Item icon={Info} title="Info">
                                <ServerInfoTab />
                            </Tab.Item>
                            {isInstalled && mode === "view" && (
                                <Tab.Item icon={BarChart3} title="Metrics">
                                    <MetricsTab
                                        timeSpan={timeSpan}
                                        setTimeSpan={setTimeSpan}
                                        timeSpanArgs={timeSpanArgs}
                                        customFrom={customFrom}
                                        setCustomFrom={setCustomFrom}
                                        customTo={customTo}
                                        setCustomTo={setCustomTo}
                                        customUnitStr={customUnitStr}
                                        setCustomUnitStr={setCustomUnitStr}
                                        uuid={uuid!}
                                    />
                                </Tab.Item>
                            )}

                            {mode === "view" && (
                                <Tab.Item icon={Bell} title="Alerts">
                                    <AlertsTab />
                                </Tab.Item>
                            )}

                            {mode === "view" && (
                                <Tab.Item icon={Cpu} title="Agent">
                                    <AgentTab />
                                </Tab.Item>
                            )}
                        </Tab>
                    </div>
                </PageLayout>
            </ChartZoomProvider>
        </ServerDetailContext.Provider>
    );
}
