import { useState, useEffect } from "react";
import { useNavigate, useMatch, Outlet } from "react-router-dom";
import { FileDown, FileBarChart } from "lucide-react";
import IndexHeader from "@/components/IndexHeader";
import { EntityPickerModal } from "../pages/reports/EntityPickerModal";
import { FilterDropdown } from "../pages/reports/FilterDropdown";
import type { FilterOption } from "../pages/reports/FilterDropdown";

export type ReportView = "global" | "clients" | "servers";
export interface ReportOutletContext {
    view: ReportView;
    filters: string[];
}

const VIEWS: { key: ReportView; label: string }[] = [
    { key: "global", label: "Global" },
    { key: "clients", label: "Clients" },
    { key: "servers", label: "Servers" },
];

const FILTER_OPTIONS: FilterOption[] = [
    { value: "online", label: "Online" },
    { value: "offline", label: "Offline" },
    { value: "production", label: "Production" },
    { value: "staging", label: "Staging" },
    { value: "development", label: "Development" },
];

export function ReportsLayout() {
    const [view, setView] = useState<ReportView>("global");
    const [pickerOpen, setPickerOpen] = useState(false);
    const [filters, setFilters] = useState<string[]>([]);
    const navigate = useNavigate();

    const detailMatch = useMatch("/report/:type/:uuid");
    const multiMatch = useMatch("/report/:type");
    const isDetailRoute = !!detailMatch || !!multiMatch;

    useEffect(() => {
        const type = detailMatch?.params.type ?? multiMatch?.params.type;
        if (type === "servers") setView("servers");
        if (type === "clients") setView("clients");
    }, [detailMatch?.params.type, multiMatch?.params.type]);
    
    const handleSelect = (uuids: string[]) => {
        setPickerOpen(false);
        if (uuids.length === 0) return;

        const idsParam = uuids.join(",");
        if (view === "servers") {
            navigate(`/report/servers?ids=${idsParam}`);
        } else {
            navigate(`/report/clients?ids=${idsParam}`);
        }
    };

    const handleGenerateReport = () => {
        // TODO: swap for real export (backend PDF endpoint or print-to-PDF of the bondpaper node)
        window.print();
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <IndexHeader
                    icon={FileBarChart}
                    title="Reports"
                    description="View and generate reports for clients and servers"
                />

                <div className="flex items-center gap-3">
                    {view !== "global" && (
                        <button
                            onClick={() => setPickerOpen(true)}
                            className="px-4 py-1.5 rounded-lg text-sm border border-border hover:bg-sidebar-hover"
                        >
                            Select {view === "servers" ? "Servers" : "Clients"}
                        </button>
                    )}
                    <div className="flex gap-1 p-1 rounded-xl bg-sidebar-hover">
                        {VIEWS.map((v) => (
                            <button
                                key={v.key}
                                onClick={() => {
                                    setView(v.key);
                                    if (isDetailRoute) navigate("/report");
                                }}
                                role="tab"
                                aria-selected={view === v.key}
                                className={
                                    view === v.key
                                        ? "px-4 py-1.5 rounded-lg bg-background font-semibold text-sm shadow-sm"
                                        : "px-4 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground"
                                }
                            >
                                {v.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-end gap-3">
                <FilterDropdown
                    options={FILTER_OPTIONS}
                    selected={filters}
                    onChange={setFilters}
                />

                <button
                    onClick={handleGenerateReport}
                    className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm bg-primary text-primary-foreground hover:opacity-90"
                >
                    <FileDown className="w-4 h-4" />
                    Generate Report
                </button>
            </div>

            <Outlet context={{ view, filters }} />

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