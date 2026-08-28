import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
} from "@/components/ui/dialog";
import type {
    FileActivityLogData,
    AgentLifecycleLogData,
} from "../hooks/useAuditLogs";
import { ServerLink } from "./ServerLink";

interface AuditDetailModalProps {
    fileLog: FileActivityLogData | null;
    lifecycleLog: AgentLifecycleLogData | null;
    onClose: () => void;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5 border-b border-border/50 py-2 last:border-0">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
                {label}
            </span>
            <span className="text-sm text-foreground break-all">
                {value === "" || value === null || value === undefined
                    ? "—"
                    : String(value)}
            </span>
        </div>
    );
}

export function AuditDetailModal({
    fileLog,
    lifecycleLog,
    onClose,
}: AuditDetailModalProps) {
    const open = fileLog !== null || lifecycleLog !== null;
    return (
        <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
                {fileLog && (
                    <>
                        <DialogHeader>
                            <DialogTitle>File Activity</DialogTitle>
                        </DialogHeader>
                        <Field label="Action" value={fileLog.action} />
                        <Field
                            label="Server"
                            value={
                                <ServerLink
                                    serverUuid={fileLog.server_uuid}
                                    serverName={fileLog.server_name}
                                    agentServers={fileLog.agent_servers}
                                />
                            }
                        />
                        <Field label="Agent ID" value={fileLog.agent_id} />
                        <Field label="File Name" value={fileLog.file_name} />
                        <Field
                            label={
                                fileLog.action === "moved" ||
                                fileLog.action === "renamed"
                                    ? "Source → Destination"
                                    : "Source Path"
                            }
                            value={
                                fileLog.action === "moved" ||
                                fileLog.action === "renamed"
                                    ? `${fileLog.source_path} → ${fileLog.destination_path}`
                                    : fileLog.source_path
                            }
                        />
                        <Field
                            label="Is Directory"
                            value={fileLog.is_directory}
                        />
                        <Field label="Occurred At" value={fileLog.occurred_at} />
                        <Field label="Event UUID" value={fileLog.uuid} />
                    </>
                )}
                {lifecycleLog && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Agent Lifecycle</DialogTitle>
                        </DialogHeader>
                        <Field
                            label="Event Type"
                            value={lifecycleLog.event_type.replace(/_/g, " ")}
                        />
                        <Field
                            label="Server"
                            value={
                                <ServerLink
                                    serverUuid={lifecycleLog.server_uuid}
                                    serverName={lifecycleLog.server_name}
                                    agentServers={lifecycleLog.agent_servers}
                                />
                            }
                        />
                        <Field label="Agent ID" value={lifecycleLog.agent_id} />
                        <Field
                            label="Occurred At"
                            value={lifecycleLog.occurred_at}
                        />
                        <Field label="Event UUID" value={lifecycleLog.uuid} />
                    </>
                )}
                <div className="mt-4 flex justify-end">
                    <DialogClose className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-border hover:bg-muted transition-colors cursor-pointer">
                        Close
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}
