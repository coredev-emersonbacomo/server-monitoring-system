import { useState } from "react";
import { Tab } from "@/components/ui/tab";
import { ScrollText, Server, FileText, Power } from "lucide-react";
import type { ActivityLogData } from "@/pages/system-logs/hooks/useActivityLogs";
import {
    type FileActivityLogData,
    type AgentLifecycleLogData,
} from "@/pages/system-logs/hooks/useAuditLogs";
import { LogTable } from "@/pages/system-logs/components/LogTable";
import { FileActivityTable } from "@/pages/system-logs/components/FileActivityTable";
import { LifecycleTable } from "@/pages/system-logs/components/LifecycleTable";
import { AuditDetailModal } from "@/pages/system-logs/components/AuditDetailModal";
import { LogDetailModal } from "@/pages/system-logs/components/LogDetailModal";

export function AgentLogsSection({ serverUuid }: { serverUuid: string }) {
    const [selectedActivity, setSelectedActivity] =
        useState<ActivityLogData | null>(null);
    const [selectedFile, setSelectedFile] =
        useState<FileActivityLogData | null>(null);
    const [selectedLife, setSelectedLife] =
        useState<AgentLifecycleLogData | null>(null);

    const serverParams = { server_uuid: serverUuid };

    return (
        <div className="mt-6 overflow-hidden">
            <Tab id="agent-logs">
                <Tab.Item icon={Server} title="Server Health">
                    <LogTable
                        url="/v1/server-health-logs"
                        params={serverParams}
                        emptyMessage="No server health logs for this server."
                        onSelectLog={setSelectedActivity}
                    />
                </Tab.Item>

                <Tab.Item icon={FileText} title="File Activity">
                    <FileActivityTable
                        url="/v1/audit/file-activity"
                        params={serverParams}
                        emptyMessage="No file activity for this server."
                        onSelect={setSelectedFile}
                    />
                </Tab.Item>

                <Tab.Item icon={ScrollText} title="Agent">
                    <LogTable
                        url="/v1/agent-logs"
                        params={serverParams}
                        emptyMessage="No agent installation/update logs for this server."
                        onSelectLog={setSelectedActivity}
                    />
                </Tab.Item>

                <Tab.Item icon={Power} title="Agent Lifecycle">
                    <LifecycleTable
                        url="/v1/audit/agent-lifecycle"
                        params={serverParams}
                        emptyMessage="No agent lifecycle events for this server."
                        onSelect={setSelectedLife}
                    />
                </Tab.Item>
            </Tab>

            <LogDetailModal
                log={selectedActivity}
                onClose={() => setSelectedActivity(null)}
            />
            <AuditDetailModal
                fileLog={selectedFile}
                lifecycleLog={selectedLife}
                onClose={() => {
                    setSelectedFile(null);
                    setSelectedLife(null);
                }}
            />
        </div>
    );
}
