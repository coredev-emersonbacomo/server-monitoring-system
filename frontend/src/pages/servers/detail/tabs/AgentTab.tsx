import { useState } from "react";
import { Cpu, Copy, Trash2, AlertTriangle, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useServerDetailContext } from "../context/ServerDetailContext";

export function AgentTab() {
    const { server, initial, copyToClipboard } = useServerDetailContext();
    const [modalOpen, setModalOpen] = useState(false);
    const [detachOpen, setDetachOpen] = useState(false);
    const [detaching, setDetaching] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    const handleCopy = (text: string, type: "uninstall_linux" | "uninstall_windows") => {
        try {
            copyToClipboard(text, type);
            setCopied(type);
            toast.success("Copied to clipboard");
            setTimeout(() => setCopied(null), 2000);
        } catch {
            toast.error("Failed to copy");
        }
    };

    const handleDetachCopy = (text: string, type: "detach_linux" | "detach_windows") => {
        try {
            copyToClipboard(text, type as never);
            setCopied(type);
            toast.success("Detach command copied — run it on the host");
            setTimeout(() => setCopied(null), 2000);
        } catch {
            toast.error("Failed to copy");
        }
    };

    const isMultiServer = (server?.agent_server_count ?? 0) > 1;

    return (
        <>
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

            {server?.agent && server.status !== 'agent_uninstalled' && !server.agent_deleted && server?.agent?.status !== 'revoked' && (
                <div className="mt-6 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                    <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3">
                        Danger Zone
                    </p>
                    {isMultiServer ? (
                        <div className="flex flex-col gap-3">
                            <p className="text-xs text-muted-foreground">
                                Detaching <strong className="text-foreground">{initial.name}</strong> will
                                remove it from the shared agent. The agent still has{" "}
                                <strong className="text-foreground">
                                    {(server.agent_server_count ?? 0) - 1} other server(s)
                                </strong>{" "}
                                on this host, so it will <strong>not</strong> be uninstalled — only this
                                server returns to the installation flow.
                            </p>
                            <Button
                                variant="danger"
                                size="sm"
                                icon={<Unplug size={13} />}
                                label="Detach Server"
                                onClick={() => setDetachOpen(true)}
                                className="w-fit"
                            />
                        </div>
                    ) : (
                        <div className="flex flex-col gap-3">
                            <p className="text-xs text-muted-foreground">
                                Uninstalling the agent stops monitoring{" "}
                                <strong className="text-foreground">{initial.name}</strong> and returns the
                                server to the installation flow.
                            </p>
                            <Button
                                variant="danger"
                                size="sm"
                                icon={<Trash2 size={13} />}
                                label="Uninstall Agent"
                                onClick={() => setModalOpen(true)}
                                className="w-fit"
                            />
                        </div>
                    )}
                </div>
            )}

            <Dialog open={detachOpen} onOpenChange={setDetachOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Unplug size={16} />
                            Detach Server
                        </DialogTitle>
                        <DialogDescription>
                            Run the command below on the machine hosting the agent to detach{" "}
                            <strong className="text-foreground">{initial.name}</strong> from the shared
                            agent. The agent has{" "}
                            <strong className="text-foreground">
                                {(server?.agent_server_count ?? 0) - 1} other server(s)
                            </strong>{" "}
                            on this host, so it will stay installed. Only this server returns to the
                            installation flow.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-3 p-3.5 bg-destructive/5 border border-destructive/20 rounded-lg text-xs text-destructive">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                            <p className="text-muted-foreground">
                                The agent sends a detach signal for this server when the command runs. The
                                server status will change to{" "}
                                <strong className="text-foreground">Agent Uninstalled</strong> in real time,
                                while the other server(s) stay online.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2.5 mt-1 text-foreground">
                            <div>
                                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    Linux (bash)
                                </label>
                                <div className="flex items-center gap-2 bg-background p-2 rounded border border-border font-mono text-[11px] overflow-x-auto select-all">
                                    <span className="flex-1 whitespace-pre-wrap break-all">
                                        {initial.detach_linux_command}
                                    </span>
                                    <button
                                        onClick={() => handleDetachCopy(initial.detach_linux_command!, "detach_linux")}
                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                    >
                                        {copied === "detach_linux" ? <span className="text-emerald-400">✓</span> : <Copy className="size-3.5" />}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    Windows (PowerShell)
                                </label>
                                <div className="flex items-center gap-2 bg-background p-2 rounded border border-border font-mono text-[11px] overflow-x-auto select-all">
                                    <span className="flex-1 whitespace-pre-wrap break-all">
                                        {initial.detach_windows_command}
                                    </span>
                                    <button
                                        onClick={() => handleDetachCopy(initial.detach_windows_command!, "detach_windows")}
                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                    >
                                        {copied === "detach_windows" ? <span className="text-emerald-400">✓</span> : <Copy className="size-3.5" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 size={16} />
                            Uninstall Agent
                        </DialogTitle>
                        <DialogDescription>
                            Run the command below on the machine hosting the
                            agent to uninstall it. This stops monitoring{" "}
                            <strong className="text-foreground">
                                {initial.name}
                            </strong>{" "}
                            and the server returns to the installation flow.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-col gap-3 p-3.5 bg-destructive/5 border border-destructive/20 rounded-lg text-xs text-destructive">
                        <div className="flex items-start gap-2">
                            <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                            <p className="text-muted-foreground">
                                The agent sends an uninstall signal to the
                                server when the command runs. The server status
                                will change to{" "}
                                <strong className="text-foreground">
                                    Agent Uninstalled
                                </strong>{" "}
                                in real time.
                            </p>
                        </div>

                        <div className="flex flex-col gap-2.5 mt-1 text-foreground">
                            <div>
                                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    Linux (bash)
                                </label>
                                <div className="flex items-center gap-2 bg-background p-2 rounded border border-border font-mono text-[11px] overflow-x-auto select-all">
                                    <span className="flex-1 whitespace-pre-wrap break-all">
                                        {initial.uninstall_linux_command}
                                    </span>
                                    <button
                                        onClick={() =>
                                            handleCopy(
                                                initial.uninstall_linux_command!,
                                                "uninstall_linux",
                                            )
                                        }
                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                    >
                                        {copied === "uninstall_linux" ? (
                                            <span className="text-emerald-400">✓</span>
                                        ) : (
                                            <Copy className="size-3.5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                                    Windows (PowerShell)
                                </label>
                                <div className="flex items-center gap-2 bg-background p-2 rounded border border-border font-mono text-[11px] overflow-x-auto select-all">
                                    <span className="flex-1 whitespace-pre-wrap break-all">
                                        {initial.uninstall_windows_command}
                                    </span>
                                    <button
                                        onClick={() =>
                                            handleCopy(
                                                initial.uninstall_windows_command!,
                                                "uninstall_windows",
                                            )
                                        }
                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
                                    >
                                        {copied === "uninstall_windows" ? (
                                            <span className="text-emerald-400">✓</span>
                                        ) : (
                                            <Copy className="size-3.5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}