import { useSearchParams, useLocation, useOutletContext } from "react-router-dom";
import ServerReportPage from "./server-report/server-report";
import ClientReportPage from "./client-report/client-report";
import { PagedPreview } from "./PagedPreview";
import type { ReportOutletContext } from "@/layouts/ReportsLayout";

export default function MultiReportsPreview() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const { showLabel } = useOutletContext<ReportOutletContext>();
    const isServer = location.pathname.includes("/report/servers");

    const ids = (searchParams.get("ids") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

    if (ids.length === 0) {
        return (
            <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">No {isServer ? "servers" : "clients"} selected.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div id="report-print-area" className="flex flex-col items-center gap-10 bg-muted/30 rounded-xl py-10 px-4">
                {ids.map((id, i) => (
                    <PagedPreview key={id} label={showLabel ? `${isServer ? "Server" : "Client"} ${i + 1}` : undefined}>
                        {isServer ? <ServerReportPage uuidOverride={id} /> : <ClientReportPage uuidOverride={id} />}
                    </PagedPreview>
                ))}
            </div>
        </div>
    );
}