import { useLocation, useOutletContext } from "react-router-dom";
import type { ReportOutletContext } from "@/layouts/ReportsLayout";
import { TypstPreview } from "./TypstPreview";

export default function MultiReportsPreview() {
    const location = useLocation();
    const { orientation, hours, selectedIds } = useOutletContext<ReportOutletContext>();
    const isServer = location.pathname.includes("/report/servers");

    const ids = selectedIds;

    if (ids.length === 0) {
        return (
            <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                    No {isServer ? "servers" : "clients"} selected.
                </p>
            </div>
        );
    }

    return (
        <div className="flex justify-center bg-muted/30 rounded-xl py-10 px-4">
            <TypstPreview
                template={isServer ? "multi-server" : "multi-client"}
                uuids={ids}
                orientation={orientation}
                hours={hours}
            />
        </div>
    );
}
