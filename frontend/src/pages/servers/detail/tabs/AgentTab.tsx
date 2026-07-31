import { Cpu, Terminal, RefreshCw, Copy, Check } from "lucide-react";
import { useServerDetailContext } from "../context/ServerDetailContext";

export function AgentTab() {
    const { server } = useServerDetailContext();
    return (
        <div className="flex flex-col gap-6 p-5 bg-card border border-t-0 border-border/60 rounded-b-lg min-h-75">
            <div className="flex items-center justify-between border-b border-border/30 pb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Cpu size={16} className="text-primary" /> Installed Agent
                    Properties
                </h3>
                {server?.agent && (
                    <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border capitalize ${server.agent.status === "online"
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                : "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                            }`}
                    >
                        {server.agent.status}
                    </span>
                )}
            </div>

            {server?.agent ? (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                            {
                                label: "Agent Version",
                                value: server.agent.version,
                            },
                            {
                                label: "Heartbeat Interval",
                                value: `${server.agent.heartbeat_interval} seconds`,
                            },
                            {
                                label: "Metrics Scan Interval",
                                value: `${server.agent.metrics_interval} seconds`,
                            },
                            {
                                label: "Port Scan Interval",
                                value: `${server.agent.port_scan_interval} seconds`,
                            },
                            {
                                label: "Service Scan Interval",
                                value: `${server.agent.service_scan_interval} seconds`,
                            },
                            {
                                label: "Process Scan Interval",
                                value: `${server.agent.process_scan_interval} seconds`,
                            },
                            {
                                label: "Update Channel",
                                value: server.agent.update_channel,
                                capitalize: true,
                            },
                            {
                                label: "Auto Update Enabled",
                                value: server.agent.auto_update ? "Yes" : "No",
                            },
                            {
                                label: "First Registered",
                                value: new Date(
                                    server.agent.registered_at,
                                ).toLocaleString(),
                            },
                            {
                                label: "Last Heartbeat",
                                value: server.agent.last_seen_at
                                    ? new Date(
                                        server.agent.last_seen_at,
                                    ).toLocaleString()
                                    : "Never",
                            },
                        ].map((prop, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between p-3 rounded-lg bg-card border border-border/40 hover:bg-muted/5 transition-colors"
                            >
                                <span className="text-xs font-medium text-muted-foreground">
                                    {prop.label}
                                </span>
                                <span
                                    className={`text-xs font-semibold text-foreground ${prop.capitalize ? "capitalize" : ""}`}
                                >
                                    {prop.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center bg-card/40 border border-border/40 rounded-xl">
                    <p className="text-sm text-muted-foreground">No agent data registered for this server yet.</p>
                </div>
            )}
        </div>
    );
}
