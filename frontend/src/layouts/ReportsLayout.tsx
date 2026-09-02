import { useState, useEffect } from "react";
import { useNavigate, useMatch, Outlet } from "react-router-dom";
import { FileBarChart, RefreshCw } from "lucide-react";
import IndexHeader from "@/components/IndexHeader";
import { EntityPickerModal } from "../pages/reports/EntityPickerModal";
import { RangeDropdown } from "../pages/reports/RangeDropdown";

export type ReportView = "global" | "clients" | "servers";
export type ReportOrientation = "landscape" | "portrait";
export interface ReportOutletContext {
    view: ReportView;
    filters: string[];
    orientation: ReportOrientation;
    /** Metrics window in hours for server reports (default: 24). */
    hours: number;
    setHours: (hours: number) => void;
    /** Increment to force a fresh compile of the currently visible report. */
    refreshToken: number;
    requestRefresh: () => void;
    /** Selected entity UUIDs for the current view (clients or servers). */
    selectedIds: string[];
}

const VIEWS: { key: ReportView; label: string }[] = [
    { key: "global", label: "Global" },
    { key: "clients", label: "Clients" },
    { key: "servers", label: "Servers" },
];

type EntityType = "clients" | "servers";

const SELECTION_KEY: Record<EntityType, string> = {
    clients: "report.selected.clients",
    servers: "report.selected.servers",
};

const HOURS_KEY = "report.hours";

const RANGE_OPTIONS: { value: number; label: string }[] = [
    { value: 6, label: "Last 6 hours" },
    { value: 12, label: "Last 12 hours" },
    { value: 24, label: "Last 24 hours" },
    { value: 168, label: "Last 7 days" },
    { value: 336, label: "Last 14 days" },
    { value: 672, label: "Last 28 days" },
];

function loadSavedIds(key: string): string[] {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed)
            ? parsed.filter((id): id is string => typeof id === "string")
            : [];
    } catch {
        return [];
    }
}

function loadSavedHours(): number {
    try {
        const raw = sessionStorage.getItem(HOURS_KEY);
        if (!raw) return 24;
        const parsed = Number.parseInt(raw, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 24;
    } catch {
        return 24;
    }
}

export function ReportsLayout() {
    const [view, setView] = useState<ReportView>("global");
    const [pickerOpen, setPickerOpen] = useState(false);
    const [orientation, setOrientation] = useState<ReportOrientation>("portrait");
    const [refreshToken, setRefreshToken] = useState(0);
    const [savedIds, setSavedIds] = useState<Record<EntityType, string[]>>({
        clients: loadSavedIds(SELECTION_KEY.clients),
        servers: loadSavedIds(SELECTION_KEY.servers),
    });
    const [hours, setHoursState] = useState<number>(loadSavedHours());
    const navigate = useNavigate();

    const detailMatch = useMatch("/report/:type/:uuid");
    const multiMatch = useMatch("/report/:type");
    const isDetailRoute = !!detailMatch || !!multiMatch;

    useEffect(() => {
        const type = detailMatch?.params.type ?? multiMatch?.params.type;
        if (type === "servers") setView("servers");
        if (type === "clients") setView("clients");
    }, [detailMatch?.params.type, multiMatch?.params.type]);

    useEffect(() => {
        sessionStorage.setItem(SELECTION_KEY.clients, JSON.stringify(savedIds.clients));
        sessionStorage.setItem(SELECTION_KEY.servers, JSON.stringify(savedIds.servers));
    }, [savedIds]);

    useEffect(() => {
        sessionStorage.setItem(HOURS_KEY, String(hours));
    }, [hours]);

    const setHours = (h: number) => setHoursState(h);

    const selectedIds = savedIds[view === "servers" ? "servers" : "clients"] ?? [];

    const handleSelect = (uuids: string[]) => {
        setPickerOpen(false);
        if (uuids.length === 0) return;

        const type: EntityType = view === "servers" ? "servers" : "clients";
        setSavedIds((prev) => ({ ...prev, [type]: uuids }));
        navigate(`/report/${type}`);
    };

    const handleTabClick = (key: ReportView) => {
        if (key === view) return;

        if (key === "global") {
            setView("global");
            if (isDetailRoute) navigate("/report");
            return;
        }

        const type = key as EntityType;
        setView(type);
        navigate(`/report/${type}`);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                <IndexHeader
                    icon={FileBarChart}
                    title="Reports"
                    description="View and generate reports for clients and servers"
                />

                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    {view !== "global" && (
                        <button
                            onClick={() => setPickerOpen(true)}
                            className="px-4 py-1.5 rounded-lg text-sm border border-border hover:bg-sidebar-hover whitespace-nowrap shrink-0"
                        >
                            Select {view === "servers" ? "Servers" : "Clients"}
                        </button>
                    )}
                    <div className="flex gap-1 p-1 rounded-xl bg-sidebar-hover shrink-0">
                        {VIEWS.map((v) => (
                            <button
                                key={v.key}
                                onClick={() => handleTabClick(v.key)}
                                role="tab"
                                aria-selected={view === v.key}
                                className={
                                    view === v.key
                                        ? "px-4 py-1.5 rounded-lg bg-background font-semibold text-sm shadow-sm whitespace-nowrap"
                                        : "px-4 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground whitespace-nowrap"
                                }
                            >
                                {v.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 w-full lg:justify-end">
                {view === "servers" && (
                    <RangeDropdown
                        value={hours}
                        onChange={setHours}
                        options={RANGE_OPTIONS}
                    />
                )}

                <button
                    onClick={() => setRefreshToken((t) => t + 1)}
                    title="Regenerate this report"
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border border-border bg-background text-foreground hover:bg-sidebar-hover shrink-0"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span className="hidden sm:inline">Refresh</span>
                </button>

                <select
                    value={orientation}
                    onChange={(e) => setOrientation(e.target.value as ReportOrientation)}
                    className="px-3 py-1.5 rounded-lg text-sm border border-border bg-background text-foreground shrink-0"
                >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                </select>
            </div>

            <Outlet
                context={{
                    view,
                    orientation,
                    hours,
                    setHours,
                    refreshToken,
                    requestRefresh: () => setRefreshToken((t) => t + 1),
                    selectedIds,
                }}
            />

            {pickerOpen && (
                <EntityPickerModal
                    type={view === "servers" ? "servers" : "clients"}
                    onSelect={handleSelect}
                    onClose={() => setPickerOpen(false)}
                />
            )}
        </div>
    );
}
