// path: frontend/src/pages/reports/report-index.tsx
import { useOutletContext, useParams, useLocation } from "react-router-dom";
import { FileText } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import type { ReportOutletContext } from "@/layouts/ReportsLayout";
import { TypstPreview } from "./TypstPreview";

function ReportWithUuid({
    uuid,
    isServer,
    orientation,
    hours,
}: {
    uuid: string;
    isServer: boolean;
    orientation: ReportOutletContext["orientation"];
    hours: ReportOutletContext["hours"];
}) {
    return (
        <TypstPreview
            template={isServer ? "server" : "client"}
            uuid={uuid}
            orientation={orientation}
            hours={hours}
        />
    );
}

function GeneralReportWithPreview({
    orientation,
    hours,
}: {
    orientation: ReportOutletContext["orientation"];
    hours: ReportOutletContext["hours"];
}) {
    return (
        <TypstPreview
            template="general"
            orientation={orientation}
            hours={hours}
        />
    );
}

export default function ReportIndexPage() {
    useDocumentTitle("Reports");
    const { view, orientation, hours } = useOutletContext<ReportOutletContext>();
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
                    hours={hours}
                />
            </div>
        );
    }

    // No uuid — show the tab-based view (Global / Clients / Servers)
    return (
        <div className="flex justify-center bg-muted/30 rounded-xl py-10 px-4">
            {view === "global" && (
                <GeneralReportWithPreview orientation={orientation} hours={hours} />
            )}

            {(view === "clients" || view === "servers") && (
                <div
                    className={`w-full bg-white text-black shadow-lg rounded-sm p-12 ${
                        orientation === "landscape"
                            ? "max-w-264 min-h-204"
                            : "max-w-204 min-h-264"
                    }`}
                >
                    <div
                        className={`flex flex-col items-center justify-center h-full gap-3 text-center ${
                            orientation === "landscape"
                                ? "min-h-180"
                                : "min-h-240"
                        }`}
                    >
                        <FileText className="w-10 h-10 text-gray-300" />
                        <p className="text-gray-500 font-medium">
                            No {view === "servers" ? "server" : "client"}{" "}
                            selected
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
