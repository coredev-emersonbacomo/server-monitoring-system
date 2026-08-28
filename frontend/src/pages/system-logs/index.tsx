import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import PageLayout from "@/components/PageLayout";
import IndexHeader from "@/components/IndexHeader";
import {
    ScrollText,
    Terminal,
    FileText,
    Server,
    FileSearch,
    Power,
} from "lucide-react";
import { Tab } from "@/components/ui/tab";
import {
    useActivityLogs,
    useServerHealthLogs,
    useAgentLogs,
    type ActivityLogData,
    type ActivityLogsParams,
} from "./hooks/useActivityLogs";
import {
    type SortableKey,
} from "./constants/logHelpers";
import type {
    FileActivityLogData,
    AgentLifecycleLogData,
    FileActivityFilters,
    LifecycleFilters,
} from "./hooks/useAuditLogs";
import { LogTable } from "./components/LogTable";
import { LogDetailModal } from "./components/LogDetailModal";
import { FileActivityTable } from "./components/FileActivityTable";
import { LifecycleTable } from "./components/LifecycleTable";
import { AuditDetailModal } from "./components/AuditDetailModal";

function AuditFilters({
    action,
    setAction,
    options,
    placeholder,
    showPath,
    path,
    setPath,
    from,
    setFrom,
    to,
    setTo,
}: {
    action: string;
    setAction: (v: string) => void;
    options: string[];
    placeholder: string;
    showPath?: boolean;
    path?: string;
    setPath?: (v: string) => void;
    from: string;
    setFrom: (v: string) => void;
    to: string;
    setTo: (v: string) => void;
}) {
    return (
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border/60 bg-card">
            <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            >
                <option value="">{placeholder}</option>
                {options.map((a) => (
                    <option key={a} value={a}>
                        {a.replace(/_/g, " ")}
                    </option>
                ))}
            </select>
            {showPath && (
                <input
                    value={path}
                    onChange={(e) => setPath?.(e.target.value)}
                    placeholder="Filter by path…"
                    className="h-8 w-56 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                />
            )}
            <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                title="From date"
            />
            <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-8 rounded-md border border-border bg-background px-2 text-sm text-foreground"
                title="To date"
            />
        </div>
    );
}

export default function LogsPage() {
    useDocumentTitle("Logs");
    const [searchParams, setSearchParams] = useSearchParams();

    const get = (key: string) => searchParams.get(key) ?? "";
    const getNum = (key: string, fallback: number) => {
        const v = searchParams.get(key);
        return v ? Number(v) : fallback;
    };

    // File Activity + Agent Lifecycle filters (URL-driven)
    const fileAction = get("file_action");
    const filePath = get("file_path");
    const fileFrom = get("file_from");
    const fileTo = get("file_to");

    const lifeEvent = get("life_event");
    const lifeFrom = get("life_from");
    const lifeTo = get("life_to");

    const updateParam = (key: string, value: string) => {
        const next = new URLSearchParams(searchParams);
        if (value) {
            next.set(key, value);
        } else {
            next.delete(key);
        }
        setSearchParams(next);
    };

    const [selectedLog, setSelectedLog] = useState<ActivityLogData | null>(
        null,
    );
    const [selectedFile, setSelectedFile] =
        useState<FileActivityLogData | null>(null);
    const [selectedLife, setSelectedLife] =
        useState<AgentLifecycleLogData | null>(null);

    // Activity / Server Health / Agent tabs: server-side, URL-driven.
    const search = get("q");
    const actionFilter = get("action") || "all";
    const userFilter = get("user") || "all";
    const startDate = get("start_date");
    const endDate = get("end_date");
    const page = getNum("page", 1);
    const perPage = getNum("per_page", 15);
    const sortField = (get("sort_field") || "created_at") as SortableKey;
    const sortDir = (get("sort_dir") || "desc") as "asc" | "desc";

    const setLogParam = (key: string, value: string) => {
        const next = new URLSearchParams(searchParams);
        if (value && value !== "all") {
            next.set(key, value);
        } else {
            next.delete(key);
        }
        next.delete("page");
        setSearchParams(next);
    };

    const setPageParam = (p: number) => {
        const next = new URLSearchParams(searchParams);
        if (p > 1) {
            next.set("page", String(p));
        } else {
            next.delete("page");
        }
        setSearchParams(next);
    };

    const setPerPageParam = (s: number) => {
        const next = new URLSearchParams(searchParams);
        if (s !== 15) {
            next.set("per_page", String(s));
        } else {
            next.delete("per_page");
        }
        next.delete("page");
        setSearchParams(next);
    };

    const setSortParam = (field: string, dir: "asc" | "desc") => {
        const next = new URLSearchParams(searchParams);
        next.set("sort_field", field);
        next.set("sort_dir", dir);
        next.delete("page");
        setSearchParams(next);
    };

    const queryParams: ActivityLogsParams = {
        page: page > 1 ? page : undefined,
        per_page: perPage !== 15 ? perPage : undefined,
        search: search || undefined,
        action: actionFilter !== "all" ? actionFilter : undefined,
        user: userFilter !== "all" ? userFilter : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        sort_field: sortField,
        sort_dir: sortDir,
    };

    const { data: activityLogs, isLoading: isLoadingActivity } =
        useActivityLogs(queryParams);
    const { data: healthLogs, isLoading: isLoadingHealth } =
        useServerHealthLogs(queryParams);
    const { data: agentLogs, isLoading: isLoadingAgent } =
        useAgentLogs(queryParams);

    const fileFilters: FileActivityFilters = {
        action: fileAction || undefined,
        path: filePath || undefined,
        occurred_at_from: fileFrom || undefined,
        occurred_at_to: fileTo || undefined,
    };

    const lifeFilters: LifecycleFilters = {
        event_type: lifeEvent || undefined,
        occurred_at_from: lifeFrom || undefined,
        occurred_at_to: lifeTo || undefined,
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
                            onSearchChange={(v) => setLogParam("q", v)}
                            actionFilter={actionFilter}
                            onActionFilterChange={(v) => setLogParam("action", v)}
                            userFilter={userFilter}
                            onUserFilterChange={(v) => setLogParam("user", v)}
                            startDate={startDate}
                            onStartDateChange={(v) => setLogParam("start_date", v)}
                            endDate={endDate}
                            onEndDateChange={(v) => setLogParam("end_date", v)}
                            sortField={sortField}
                            sortDir={sortDir}
                            onSort={(key) => {
                                if (sortField === key) {
                                    setSortParam(key, sortDir === "asc" ? "desc" : "asc");
                                } else {
                                    setSortParam(key, "asc");
                                }
                            }}
                            onPageChange={setPageParam}
                            onPerPageChange={setPerPageParam}
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
                            onSearchChange={(v) => setLogParam("q", v)}
                            actionFilter={actionFilter}
                            onActionFilterChange={(v) => setLogParam("action", v)}
                            userFilter={userFilter}
                            onUserFilterChange={(v) => setLogParam("user", v)}
                            startDate={startDate}
                            onStartDateChange={(v) => setLogParam("start_date", v)}
                            endDate={endDate}
                            onEndDateChange={(v) => setLogParam("end_date", v)}
                            sortField={sortField}
                            sortDir={sortDir}
                            onSort={(key) => {
                                if (sortField === key) {
                                    setSortParam(key, sortDir === "asc" ? "desc" : "asc");
                                } else {
                                    setSortParam(key, "asc");
                                }
                            }}
                            onPageChange={setPageParam}
                            onPerPageChange={setPerPageParam}
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
                            onSearchChange={(v) => setLogParam("q", v)}
                            actionFilter={actionFilter}
                            onActionFilterChange={(v) => setLogParam("action", v)}
                            userFilter={userFilter}
                            onUserFilterChange={(v) => setLogParam("user", v)}
                            startDate={startDate}
                            onStartDateChange={(v) => setLogParam("start_date", v)}
                            endDate={endDate}
                            onEndDateChange={(v) => setLogParam("end_date", v)}
                            sortField={sortField}
                            sortDir={sortDir}
                            onSort={(key) => {
                                if (sortField === key) {
                                    setSortParam(key, sortDir === "asc" ? "desc" : "asc");
                                } else {
                                    setSortParam(key, "asc");
                                }
                            }}
                            onPageChange={setPageParam}
                            onPerPageChange={setPerPageParam}
                            onSelectLog={setSelectedLog}
                        />
                    </Tab.Item>

                    <Tab.Item icon={FileSearch} title="File Activity">
                        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                            <AuditFilters
                                action={fileAction}
                                setAction={(v) => updateParam("file_action", v)}
                                options={[
                                    "created",
                                    "modified",
                                    "moved",
                                    "renamed",
                                    "deleted",
                                ]}
                                placeholder="All actions"
                                showPath
                                path={filePath}
                                setPath={(v) => updateParam("file_path", v)}
                                from={fileFrom}
                                setFrom={(v) => updateParam("file_from", v)}
                                to={fileTo}
                                setTo={(v) => updateParam("file_to", v)}
                            />
                            <FileActivityTable
                                url="/v1/audit/file-activity"
                                params={{
                                    action: fileFilters.action,
                                    path: fileFilters.path,
                                    occurred_at_from: fileFilters.occurred_at_from,
                                    occurred_at_to: fileFilters.occurred_at_to,
                                }}
                                emptyMessage="No file activity recorded yet."
                                onSelect={setSelectedFile}
                            />
                        </div>
                    </Tab.Item>

                    <Tab.Item icon={Power} title="Agent Lifecycle">
                        <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
                            <AuditFilters
                                action={lifeEvent}
                                setAction={(v) => updateParam("life_event", v)}
                                options={[
                                    "started",
                                    "stopping",
                                    "stopped",
                                    "unexpectedly_disconnected",
                                ]}
                                placeholder="All events"
                                from={lifeFrom}
                                setFrom={(v) => updateParam("life_from", v)}
                                to={lifeTo}
                                setTo={(v) => updateParam("life_to", v)}
                            />
                            <LifecycleTable
                                url="/v1/audit/agent-lifecycle"
                                params={{
                                    event_type: lifeFilters.event_type,
                                    occurred_at_from: lifeFilters.occurred_at_from,
                                    occurred_at_to: lifeFilters.occurred_at_to,
                                }}
                                emptyMessage="No agent lifecycle events recorded yet."
                                onSelect={setSelectedLife}
                            />
                        </div>
                    </Tab.Item>
                </Tab>
            </main>

            <LogDetailModal
                log={selectedLog}
                onClose={() => setSelectedLog(null)}
            />
            <AuditDetailModal
                fileLog={selectedFile}
                lifecycleLog={selectedLife}
                onClose={() => {
                    setSelectedFile(null);
                    setSelectedLife(null);
                }}
            />
        </PageLayout>
    );
}
