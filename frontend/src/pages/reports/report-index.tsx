// path: frontend/src/pages/reports/report-index.tsx
import { useOutletContext, useParams, useLocation } from "react-router-dom";
import { FileText } from "lucide-react";
import GeneralReport from "./general-report/general-report";
import ServerReportPage from "./server-report/server-report";
import ClientReportPage from "./client-report/client-report";
import type { ReportOutletContext } from "@/layouts/ReportsLayout";
import { PagedPreview } from "./PagedPreview";

export default function ReportIndexPage() {
    const { view, showLabel } = useOutletContext<ReportOutletContext>();
    const { uuid } = useParams<{ uuid?: string }>();
    const location = useLocation();
    const isServer = location.pathname.includes("/report/servers");

    // A specific server or client report is selected (uuid present in the URL)
    if (uuid) {
        return (
            <div id="report-print-area" className="flex justify-center bg-muted/30 rounded-xl py-10 px-4">
                <PagedPreview label={showLabel ? (isServer ? "Server Report" : "Client Report") : undefined}>
                    {isServer ? <ServerReportPage /> : <ClientReportPage />}
                </PagedPreview>
            </div>
        );
    }

    // No uuid — show the tab-based view (Global / Clients / Servers)
    return (
        <div id="report-print-area" className="flex justify-center bg-muted/30 rounded-xl py-10 px-4">
            {view === "global" && (
                <PagedPreview>
                    <GeneralReport />
                </PagedPreview>
            )}

            {(view === "clients" || view === "servers") && (
                <div className="w-full max-w-[66rem] min-h-[51rem] bg-white text-black shadow-lg rounded-sm p-12">
                    <div className="flex flex-col items-center justify-center h-full min-h-[45rem] gap-3 text-center">
                        <FileText className="w-10 h-10 text-gray-300" />
                        <p className="text-gray-500 font-medium">
                            No {view === "servers" ? "server" : "client"} selected
                        </p>
                        <p className="text-sm text-gray-400 max-w-xs">
                            Click "Select {view === "servers" ? "Server" : "Client"}" above to choose one and view its report.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}