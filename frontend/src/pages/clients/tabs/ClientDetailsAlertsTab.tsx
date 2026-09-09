import { NodeConfigEditor } from "@/components/node-config/NodeConfigEditor";
import type { ClientData } from "@/types/models";
import type { useClientAlertTab } from "../hooks/useClientAlertTab";

interface ClientDetailsAlertsTabProps {
    client: ClientData;
    clientAlertTab: ReturnType<typeof useClientAlertTab>;
}

export function ClientDetailsAlertsTab({ client, clientAlertTab }: ClientDetailsAlertsTabProps) {
    return (
        <div className="bg-card border border-border/60 shadow-sm p-6 sm:p-8 flex flex-col gap-6">
            <div>
                <label className="text-sm font-medium text-foreground">Alert Scope</label>
                <p className="text-xs text-muted-foreground mb-3">
                    Choose which alert configuration applies to this client's servers.
                </p>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="alertScope"
                            value="global"
                            checked={clientAlertTab.alertScope === "global"}
                            onChange={() => clientAlertTab.setAlertScope("global")}
                            className="accent-primary"
                        />
                        <span className="text-sm">Global</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="alertScope"
                            value="client"
                            checked={clientAlertTab.alertScope === "client"}
                            onChange={() => clientAlertTab.setAlertScope("client")}
                            className="accent-primary"
                        />
                        <span className="text-sm">Client</span>
                    </label>
                </div>
            </div>
            <NodeConfigEditor
                configKey={clientAlertTab.configKey}
                scopeLabel={client?.name ?? ""}
                showControls={false}
                showMinimap={false}
                showNodeTypesSidebar={false}
            />
        </div>
    );
}
