// path: frontend/src/pages/reports/report-index.tsx
import { useOutletContext, useParams, useLocation } from "react-router-dom";
import { FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { mockGetClientReport } from "./client-report/mockClientReport";
import { mockGetServerReport } from "./server-report/mockServerReport";
import { mockGetGeneralReport } from "./general-report/mockGeneralReport";
import type { ReportOutletContext } from "@/layouts/ReportsLayout";
import { TypstPreview } from "./TypstPreview";

function ReportWithUuid({
    uuid,
    isServer,
    orientation,
}: {
    uuid: string;
    isServer: boolean;
    orientation: ReportOutletContext["orientation"];
}) {
    const { data, isLoading, error } = useQuery({
        queryKey: [isServer ? "server-report" : "client-report", uuid],
        queryFn: () =>
            isServer
                ? mockGetServerReport(uuid)
                : mockGetClientReport(uuid),
        enabled: !!uuid,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm">Loading report data...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex items-center justify-center py-20">
                <p className="text-sm text-red-600">Failed to load report.</p>
            </div>
        );
    }

    // Strip metrics (too large for PDF, chart SVGs handled separately)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { metrics, ...reportData } = data;

    return (
        <TypstPreview
            template={isServer ? "server" : "client"}
            data={reportData}
            orientation={orientation}
        />
    );
}

function GeneralReportWithPreview({
    orientation,
}: {
    orientation: ReportOutletContext["orientation"];
}) {
    const { data, isLoading, error } = useQuery({
        queryKey: ["general-report"],
        queryFn: mockGetGeneralReport,
    });

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm">Loading report data...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="flex items-center justify-center py-20">
                <p className="text-sm text-red-600">Failed to load report.</p>
            </div>
        );
    }

    return (
        <TypstPreview
            template="general"
            data={data}
            orientation={orientation}
        />
    );
}

export default function ReportIndexPage() {
    const { view, orientation } = useOutletContext<ReportOutletContext>();
    const { uuid } = useParams<{ uuid?: string }>();
    const location = useLocation();
    const isServer = location.pathname.includes("/report/servers");

    // A specific server or client report is selected (uuid present in the URL)
    if (uuid) {
        return (
            <div className="flex justify-center bg-muted/30 rounded-xl py-10 px-4">
                <ReportWithUuid
                    uuid={uuid}
                    isServer={isServer}
                    orientation={orientation}
                />
            </div>
        );
    }

    // No uuid — show the tab-based view (Global / Clients / Servers)
    return (
        <div className="flex justify-center bg-muted/30 rounded-xl py-10 px-4">
            {view === "global" && (
                <GeneralReportWithPreview orientation={orientation} />
            )}

            {(view === "clients" || view === "servers") && (
                <div
                    className={`w-full bg-white text-black shadow-lg rounded-sm p-12 ${
                        orientation === "landscape"
                            ? "max-w-[66rem] min-h-[51rem]"
                            : "max-w-[51rem] min-h-[66rem]"
                    }`}
                >
                    <div
                        className={`flex flex-col items-center justify-center h-full gap-3 text-center ${
                            orientation === "landscape"
                                ? "min-h-[45rem]"
                                : "min-h-[60rem]"
                        }`}
                    >
                        <FileText className="w-10 h-10 text-gray-300" />
                        <p className="text-gray-500 font-medium">
                            No{" "}
                            {view === "servers" ? "server" : "client"} selected
                        </p>
                        <p className="text-sm text-gray-400 max-w-xs">
                            Click &quot;Select{" "}
                            {view === "servers" ? "Server" : "Client"}
                            &quot; above to choose one and view its report.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}
