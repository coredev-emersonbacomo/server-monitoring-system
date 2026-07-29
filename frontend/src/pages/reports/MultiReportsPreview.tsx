import { useSearchParams, useLocation, useOutletContext } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { mockGetClientReport } from "./client-report/mockClientReport";
import { mockGetServerReport } from "./server-report/mockServerReport";
import type { ReportOutletContext } from "@/layouts/ReportsLayout";
import { TypstPreview } from "./TypstPreview";

export default function MultiReportsPreview() {
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const { orientation } = useOutletContext<ReportOutletContext>();
    const isServer = location.pathname.includes("/report/servers");

    const ids = (searchParams.get("ids") ?? "")
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

    const queries = useQueries({
        queries: ids.map((id) => ({
            queryKey: [isServer ? "server-report" : "client-report", id],
            queryFn: () =>
                isServer ? mockGetServerReport(id) : mockGetClientReport(id),
        })),
    });

    const isLoading = queries.some((q) => q.isLoading);
    const failedQuery = queries.find((q) => q.isError);

    if (ids.length === 0) {
        return (
            <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                    No {isServer ? "servers" : "clients"} selected.
                </p>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-3 text-muted-foreground">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm">
                        Loading {queries.filter((q) => q.isLoading).length}{" "}
                        {isServer ? "server" : "client"} reports...
                    </p>
                </div>
            </div>
        );
    }

    if (failedQuery) {
        return (
            <div className="flex items-center justify-center py-20">
                <p className="text-sm text-red-600">
                    Failed to load one or more reports.
                </p>
            </div>
        );
    }

    const items = queries
        .map((q) => q.data)
        .filter(Boolean)
        .map((report) => Object.fromEntries(
            Object.entries(report).filter(([k]) => k !== "metrics"),
        ));

    const template = isServer ? "multi-server" : "multi-client";

    return (
        <div className="flex justify-center bg-muted/30 rounded-xl py-10 px-4">
            <TypstPreview
                template={template}
                data={{ items }}
                orientation={orientation}
            />
        </div>
    );
}
