import { useLocation, useParams } from "react-router-dom";
import ServerReportPage from "./server-report/server-report";
import ClientReportPage from "./client-report/client-report";

export default function ReportsPreview() {
    const { uuid } = useParams<{ uuid: string }>();
    const location = useLocation();
    const isServer = location.pathname.includes("/report/servers/");

    if (!uuid) {
        return (
            <div className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">Missing report identifier.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="flex justify-center bg-muted/30 rounded-xl py-10 px-4">
                <div className="w-full max-w-[51rem] min-h-[66rem] bg-white text-black shadow-lg rounded-sm p-12">
                    {isServer ? <ServerReportPage /> : <ClientReportPage />}
                </div>
            </div>
        </div>
    );
}