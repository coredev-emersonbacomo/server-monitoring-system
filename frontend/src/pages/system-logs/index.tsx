import { useCallback, useMemo, useState } from "react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import PageLayout from "@/components/PageLayout";
import IndexHeader from "@/components/IndexHeader";
import { ScrollText, Terminal, FileText, Server } from "lucide-react";
import { Tab } from "@/components/ui/tab";
import {
    useActivityLogs,
    useServerHealthLogs,
    useAgentLogs,
    type ActivityLogData,
} from "./hooks/useActivityLogs";
import type { SortableKey } from "./constants/logHelpers";
import { LogTable } from "./components/LogTable";
import { LogDetailModal } from "./components/LogDetailModal";

export default function LogsPage() {
    useDocumentTitle("Logs");
    const { data: activityLogs = [], isLoading: isLoadingActivity } =
        useActivityLogs();
    const { data: healthLogs = [], isLoading: isLoadingHealth } =
        useServerHealthLogs();
    const { data: agentLogs = [], isLoading: isLoadingAgent } = useAgentLogs();

    const typedActivity = activityLogs as ActivityLogData[];
    const typedHealth = healthLogs as ActivityLogData[];
    const typedAgent = agentLogs as ActivityLogData[];

    const [sortField, setSortField] = useState<SortableKey>("created_at");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
    const [selectedLog, setSelectedLog] = useState<ActivityLogData | null>(
        null,
    );

    const handleSort = (key: SortableKey) => {
        if (sortField === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(key);
            setSortDir("asc");
        }
    };

    const sortFn = useCallback((list: ActivityLogData[]) => {
        const copy = [...list];
        copy.sort((a, b) => {
            const aVal = a[sortField] ?? "";
            const bVal = b[sortField] ?? "";

            if (sortField === "created_at") {
                const aTime = aVal ? new Date(aVal as string).getTime() : 0;
                const bTime = bVal ? new Date(bVal as string).getTime() : 0;
                const diff = aTime - bTime;
                return sortDir === "asc" ? diff : -diff;
            }

            const aStr = String(aVal).toLowerCase();
            const bStr = String(bVal).toLowerCase();
            if (aStr < bStr) return sortDir === "asc" ? -1 : 1;
            if (aStr > bStr) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
        return copy;
    }, [sortField, sortDir]);

    const sortedActivity = useMemo(
        () => sortFn(typedActivity),
        [typedActivity, sortFn],
    );
    const sortedHealth = useMemo(
        () => sortFn(typedHealth),
        [typedHealth, sortFn],
    );
    const sortedAgent = useMemo(
        () => sortFn(typedAgent),
        [typedAgent, sortFn],
    );

    return (
        <PageLayout>
            <IndexHeader icon={ScrollText} title="Logs" />

            <main className="w-full flex-1 min-h-0">
                <Tab>
                    <Tab.Item icon={Terminal} title="Activity">
                        <LogTable
                            logs={sortedActivity}
                            isLoading={isLoadingActivity}
                            emptyMessage="No general activity logs recorded yet."
                            sortField={sortField}
                            sortDir={sortDir}
                            onSort={handleSort}
                            onSelectLog={setSelectedLog}
                        />
                    </Tab.Item>

                    <Tab.Item icon={Server} title="Server Health">
                        <LogTable
                            logs={sortedHealth}
                            isLoading={isLoadingHealth}
                            emptyMessage="No server health status logs recorded yet."
                            sortField={sortField}
                            sortDir={sortDir}
                            onSort={handleSort}
                            onSelectLog={setSelectedLog}
                        />
                    </Tab.Item>

                    <Tab.Item icon={FileText} title="Agent">
                        <LogTable
                            logs={sortedAgent}
                            isLoading={isLoadingAgent}
                            emptyMessage="No agent installation/update logs recorded yet."
                            sortField={sortField}
                            sortDir={sortDir}
                            onSort={handleSort}
                            onSelectLog={setSelectedLog}
                        />
                    </Tab.Item>
                </Tab>
            </main>

            <LogDetailModal
                log={selectedLog}
                onClose={() => setSelectedLog(null)}
            />
        </PageLayout>
    );
}
