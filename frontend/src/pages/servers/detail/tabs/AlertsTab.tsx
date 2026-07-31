import { NodeConfigEditor } from "@/components/node-config/NodeConfigEditor";
import { useServerDetailContext } from "../context/ServerDetailContext";

export function AlertsTab() {
    const { serverAlertTab, initial } = useServerDetailContext();
    return (
        <div className="bg-card border border-border/60 shadow-sm p-6 sm:p-8 flex flex-col gap-6">
            <div>
                <label className="text-sm font-medium text-foreground">
                    Alert Scope
                </label>
                <p className="text-xs text-muted-foreground mb-3">
                    Choose which alert configuration applies to this server.
                </p>
                <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="alertScope"
                            value="global"
                            checked={serverAlertTab.alertScope === "global"}
                            onChange={() =>
                                serverAlertTab.setAlertScope("global")
                            }
                            className="accent-primary"
                        />
                        <span className="text-sm">Global</span>
                    </label>
                    {serverAlertTab.clientUuid && (
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="alertScope"
                                value="client"
                                checked={serverAlertTab.alertScope === "client"}
                                onChange={() =>
                                    serverAlertTab.setAlertScope("client")
                                }
                                className="accent-primary"
                            />
                            <span className="text-sm">Client</span>
                        </label>
                    )}
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="radio"
                            name="alertScope"
                            value="server"
                            checked={serverAlertTab.alertScope === "server"}
                            onChange={() =>
                                serverAlertTab.setAlertScope("server")
                            }
                            className="accent-primary"
                        />
                        <span className="text-sm">Server</span>
                    </label>
                </div>
            </div>
            <NodeConfigEditor
                configKey={serverAlertTab.configKey}
                scopeLabel={
                    serverAlertTab.alertScope === "server"
                        ? (initial?.name ?? "")
                        : serverAlertTab.alertScope === "client"
                            ? (initial?.client_name ?? "")
                            : ""
                }
                showControls={false}
                showMinimap={false}
                showNodeTypesSidebar={false}
            />
        </div>
    );
}
