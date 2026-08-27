import { useState } from "react";
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

    // Search and filter states
    const [search, setSearch] = useState("");
    const [actionFilter, setActionFilter] = useState("all");
    const [userFilter, setUserFilter] = useState("all");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(15);
    const [sortField, setSortField] = useState<SortableKey>("created_at");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const [selectedLog, setSelectedLog] = useState<ActivityLogData | null>(null);

    const queryParams = {
        page,
        per_page: perPage,
        search: search || undefined,
        action: actionFilter !== "all" ? actionFilter : undefined,
        user: userFilter !== "all" ? userFilter : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        sort_field: sortField,
        sort_dir: sortDir,
    };

    const { data: activityLogs, isLoading: isLoadingActivity } = useActivityLogs(queryParams);
    const { data: healthLogs, isLoading: isLoadingHealth } = useServerHealthLogs(queryParams);
    const { data: agentLogs, isLoading: isLoadingAgent } = useAgentLogs(queryParams);

    const handleSort = (key: SortableKey) => {
        if (sortField === key) {
            setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        } else {
            setSortField(key);
            setSortDir("asc");
        }
        setPage(1);
    };

    const handleSearchChange = (val: string) => {
        setSearch(val);
        setPage(1);
    };

    const handleActionFilterChange = (val: string) => {
        setActionFilter(val);
        setPage(1);
    };

    const handleUserFilterChange = (val: string) => {
        setUserFilter(val);
        setPage(1);
    };

    const handleStartDateChange = (val: string) => {
        setStartDate(val);
        setPage(1);
    };

    const handleEndDateChange = (val: string) => {
        setEndDate(val);
        setPage(1);
    };

    const handlePerPageChange = (size: number) => {
        setPerPage(size);
        setPage(1);
    };

    return (
        <PageLayout>
            <IndexHeader icon={ScrollText} title="Logs" />

            <main className="w-full flex-1 min-h-0">
                <Tab>
                    <Tab.Item icon={Terminal} title="Activity">
                        <LogTable
                            data={activityLogs?.data ?? []}
                            total={activityLogs?.total ?? 0}
                            currentPage={activityLogs?.current_page ?? 1}
                            perPage={activityLogs?.per_page ?? perPage}
                            lastPage={activityLogs?.last_page ?? 1}
                            isLoading={isLoadingActivity}
                            emptyMessage="No general activity logs recorded yet."
                            search={search}
                            onSearchChange={handleSearchChange}
                            actionFilter={actionFilter}
                            onActionFilterChange={handleActionFilterChange}
                            userFilter={userFilter}
                            onUserFilterChange={handleUserFilterChange}
                            startDate={startDate}
                            onStartDateChange={handleStartDateChange}
                            endDate={endDate}
                            onEndDateChange={handleEndDateChange}
                            sortField={sortField}
                            sortDir={sortDir}
                            onSort={handleSort}
                            onPageChange={setPage}
                            onPerPageChange={handlePerPageChange}
                            onSelectLog={setSelectedLog}
                        />
                    </Tab.Item>

                    <Tab.Item icon={Server} title="Server Health">
                        <LogTable
                            data={healthLogs?.data ?? []}
                            total={healthLogs?.total ?? 0}
                            currentPage={healthLogs?.current_page ?? 1}
                            perPage={healthLogs?.per_page ?? perPage}
                            lastPage={healthLogs?.last_page ?? 1}
                            isLoading={isLoadingHealth}
                            emptyMessage="No server health status logs recorded yet."
                            search={search}
                            onSearchChange={handleSearchChange}
                            actionFilter={actionFilter}
                            onActionFilterChange={handleActionFilterChange}
                            userFilter={userFilter}
                            onUserFilterChange={handleUserFilterChange}
                            startDate={startDate}
                            onStartDateChange={handleStartDateChange}
                            endDate={endDate}
                            onEndDateChange={handleEndDateChange}
                            sortField={sortField}
                            sortDir={sortDir}
                            onSort={handleSort}
                            onPageChange={setPage}
                            onPerPageChange={handlePerPageChange}
                            onSelectLog={setSelectedLog}
                        />
                    </Tab.Item>

                    <Tab.Item icon={FileText} title="Agent">
                        <LogTable
                            data={agentLogs?.data ?? []}
                            total={agentLogs?.total ?? 0}
                            currentPage={agentLogs?.current_page ?? 1}
                            perPage={agentLogs?.per_page ?? perPage}
                            lastPage={agentLogs?.last_page ?? 1}
                            isLoading={isLoadingAgent}
                            emptyMessage="No agent installation/update logs recorded yet."
                            search={search}
                            onSearchChange={handleSearchChange}
                            actionFilter={actionFilter}
                            onActionFilterChange={handleActionFilterChange}
                            userFilter={userFilter}
                            onUserFilterChange={handleUserFilterChange}
                            startDate={startDate}
                            onStartDateChange={handleStartDateChange}
                            endDate={endDate}
                            onEndDateChange={handleEndDateChange}
                            sortField={sortField}
                            sortDir={sortDir}
                            onSort={handleSort}
                            onPageChange={setPage}
                            onPerPageChange={handlePerPageChange}
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
