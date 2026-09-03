import { useEffect, useRef, useState } from "react";
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
    const [pathInput, setPathInput] = useState(path ?? "");
    const pathTimer = useRef<number | undefined>(undefined);

    useEffect(() => {
        return () => window.clearTimeout(pathTimer.current);
    }, []);

    useEffect(() => {
        if (pathTimer.current !== undefined) return;
        setPathInput(path ?? "");
    }, [path]);

    const handlePathChange = (value: string) => {
        setPathInput(value);
        window.clearTimeout(pathTimer.current);
        pathTimer.current = window.setTimeout(() => setPath?.(value), 300);
    };

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
                    value={pathInput}
                    onChange={(e) => handlePathChange(e.target.value)}
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
    const getIdPage = (id: string, fallback = 1) => {
        const v = searchParams.get(`${id}_page`) ?? searchParams.get("page");
        return v ? Number(v) : fallback;
    };
    const getIdPerPage = (id: string, fallback = 15) => {
        const v = searchParams.get(`${id}_per_page`) ?? searchParams.get("per_page");
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
    // Use id-scoped pagination so multiple LogTables on the same page don't collide on `page`.
    const search = get("q");
    const actionFilter = get("action") || "all";
    const userFilter = get("user") || "all";
    const startDate = get("start_date");
    const endDate = get("end_date");
    const page = getNum("page", 1);
    const perPage = getNum("per_page", 15);
    const sortField = (get("sort_field") || "created_at") as SortableKey;
    const sortDir = (get("sort_dir") || "desc") as "asc" | "desc";

    const setLogParam = (key: string, value: string, _scopeId?: string) => {
        const next = new URLSearchParams(searchParams);
        if (value && value !== "all") {
            next.set(key, value);
        } else {
            next.delete(key);
        }
        // Clear pagination for all tables when filters change — scalable: remove any pagination key.
        for (const k of Array.from(next.keys())) {
            if (
                k === "page" ||
                k === "per_page" ||
                k === "cursor" ||
                k === "previous_cursor" ||
                k.endsWith("_page") ||
                k.endsWith("_per_page") ||
                k.endsWith("_cursor") ||
                k.endsWith("_previous_cursor")
            ) {
                next.delete(k);
            }
        }
        setSearchParams(next);
    };

    const setPageParam = (p: number, id?: string) => {
        const next = new URLSearchParams(searchParams);
        const key = id ? `${id}_page` : "page";
        if (p > 1) {
            next.set(key, String(p));
        } else {
            next.delete(key);
        }
        // Keep legacy `page` in sync for backward compat when no id
        if (!id) next.delete("page");
        setSearchParams(next);
    };

    const setPerPageParam = (s: number, id?: string) => {
        const next = new URLSearchParams(searchParams);
        const key = id ? `${id}_per_page` : "per_page";
        if (s !== 15) {
            next.set(key, String(s));
        } else {
            next.delete(key);
        }
        const pageKey = id ? `${id}_page` : "page";
        next.delete(pageKey);
        setSearchParams(next);
    };

    const setSortParam = (field: string, dir: "asc" | "desc", id?: string) => {
        const next = new URLSearchParams(searchParams);
        next.set("sort_field", field);
        next.set("sort_dir", dir);
        const pageKey = id ? `${id}_page` : "page";
        next.delete(pageKey);
        setSearchParams(next);
    };

    const activityPage = getIdPage("activity", page);
    const activityPerPage = getIdPerPage("activity", perPage);
    const healthPage = getIdPage("health", page);
    const healthPerPage = getIdPerPage("health", perPage);
    const agentPage = getIdPage("agent", page);
    const agentPerPage = getIdPerPage("agent", perPage);

    const baseQueryParams = {
        search: search || undefined,
        action: actionFilter !== "all" ? actionFilter : undefined,
        user: userFilter !== "all" ? userFilter : undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        sort_field: sortField,
        sort_dir: sortDir,
    };
    const activityQueryParams: ActivityLogsParams = {
        page: activityPage > 1 ? activityPage : undefined,
        per_page: activityPerPage !== 15 ? activityPerPage : undefined,
        ...baseQueryParams,
    };
    const healthQueryParams: ActivityLogsParams = {
        page: healthPage > 1 ? healthPage : undefined,
        per_page: healthPerPage !== 15 ? healthPerPage : undefined,
        ...baseQueryParams,
    };
    const agentQueryParams: ActivityLogsParams = {
        page: agentPage > 1 ? agentPage : undefined,
        per_page: agentPerPage !== 15 ? agentPerPage : undefined,
        ...baseQueryParams,
    };

    const { data: activityLogs, isLoading: isLoadingActivity } =
        useActivityLogs(activityQueryParams);
    const { data: healthLogs, isLoading: isLoadingHealth } =
        useServerHealthLogs(healthQueryParams);
    const { data: agentLogs, isLoading: isLoadingAgent } =
        useAgentLogs(agentQueryParams);

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
                            id="activity"
                            data={activityLogs?.data ?? []}
                            total={activityLogs?.total ?? 0}
                            currentPage={activityLogs?.current_page ?? 1}
                            perPage={activityLogs?.per_page ?? activityPerPage}
                            lastPage={activityLogs?.last_page ?? 1}
                            isLoading={isLoadingActivity}
                            emptyMessage="No general activity logs recorded yet."
                            search={search}
                            onSearchChange={(v) => setLogParam("q", v, "activity")}
                            actionFilter={actionFilter}
                            onActionFilterChange={(v) => setLogParam("action", v, "activity")}
                            userFilter={userFilter}
                            onUserFilterChange={(v) => setLogParam("user", v, "activity")}
                            startDate={startDate}
                            onStartDateChange={(v) => setLogParam("start_date", v, "activity")}
                            endDate={endDate}
                            onEndDateChange={(v) => setLogParam("end_date", v, "activity")}
                            sortField={sortField}
                            sortDir={sortDir}
                            onSort={(key) => {
                                if (sortField === key) {
                                    setSortParam(key, sortDir === "asc" ? "desc" : "asc", "activity");
                                } else {
                                    setSortParam(key, "asc", "activity");
                                }
                            }}
                            onPageChange={(p) => setPageParam(p, "activity")}
                            onPerPageChange={(s) => setPerPageParam(s, "activity")}
                            onSelectLog={setSelectedLog}
                        />
                    </Tab.Item>

                    <Tab.Item icon={Server} title="Server Health">
                        <LogTable
                            id="health"
                            data={healthLogs?.data ?? []}
                            total={healthLogs?.total ?? 0}
                            currentPage={healthLogs?.current_page ?? 1}
                            perPage={healthLogs?.per_page ?? healthPerPage}
                            lastPage={healthLogs?.last_page ?? 1}
                            isLoading={isLoadingHealth}
                            emptyMessage="No server health status logs recorded yet."
                            search={search}
                            onSearchChange={(v) => setLogParam("q", v, "health")}
                            showUser={false}
                            actionFilter={actionFilter}
                            onActionFilterChange={(v) => setLogParam("action", v, "health")}
                            userFilter={userFilter}
                            onUserFilterChange={(v) => setLogParam("user", v, "health")}
                            startDate={startDate}
                            onStartDateChange={(v) => setLogParam("start_date", v, "health")}
                            endDate={endDate}
                            onEndDateChange={(v) => setLogParam("end_date", v, "health")}
                            sortField={sortField}
                            sortDir={sortDir}
                            onSort={(key) => {
                                if (sortField === key) {
                                    setSortParam(key, sortDir === "asc" ? "desc" : "asc", "health");
                                } else {
                                    setSortParam(key, "asc", "health");
                                }
                            }}
                            onPageChange={(p) => setPageParam(p, "health")}
                            onPerPageChange={(s) => setPerPageParam(s, "health")}
                            onSelectLog={setSelectedLog}
                        />
                    </Tab.Item>

                    <Tab.Item icon={FileText} title="Agent">
                        <LogTable
                            id="agent"
                            data={agentLogs?.data ?? []}
                            total={agentLogs?.total ?? 0}
                            currentPage={agentLogs?.current_page ?? 1}
                            perPage={agentLogs?.per_page ?? agentPerPage}
                            lastPage={agentLogs?.last_page ?? 1}
                            isLoading={isLoadingAgent}
                            emptyMessage="No agent installation/update logs recorded yet."
                            search={search}
                            onSearchChange={(v) => setLogParam("q", v, "agent")}
                            actionFilter={actionFilter}
                            onActionFilterChange={(v) => setLogParam("action", v, "agent")}
                            userFilter={userFilter}
                            onUserFilterChange={(v) => setLogParam("user", v, "agent")}
                            startDate={startDate}
                            onStartDateChange={(v) => setLogParam("start_date", v, "agent")}
                            endDate={endDate}
                            onEndDateChange={(v) => setLogParam("end_date", v, "agent")}
                            sortField={sortField}
                            sortDir={sortDir}
                            onSort={(key) => {
                                if (sortField === key) {
                                    setSortParam(key, sortDir === "asc" ? "desc" : "asc", "agent");
                                } else {
                                    setSortParam(key, "asc", "agent");
                                }
                            }}
                            onPageChange={(p) => setPageParam(p, "agent")}
                            onPerPageChange={(s) => setPerPageParam(s, "agent")}
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
                                id="file_activity"
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
                                id="lifecycle"
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
