import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import jwtClient from "@/api/jwtClient";
import type { ClientReport } from "../reportTypes";
import { ReportHeader } from "../ReportHeader";

const BORDER = { border: "1px solid #d1d5db" };
export default function ClientReportPage({ uuidOverride }: { uuidOverride?: string } = {}) {
    const { uuid: paramUuid } = useParams<{ uuid: string }>();
    const uuid = uuidOverride ?? paramUuid;

    const { data: report, isLoading, error } = useQuery({
        queryKey: ["client-report", uuid],
        queryFn: async () => {
            const { data } = await jwtClient.get(`/v1/reports/client/${uuid}`);
            return data as ClientReport;
        },
        enabled: !!uuid,
    });

    if (isLoading) return <div className="p-8">Loading report...</div>;
    if (error || !report) return <div className="p-8">Failed to load report.</div>;

    return (
        <div className="flex flex-col gap-6">
            <ReportHeader
                title={report.name}
                subtitle="Client-specific report"
            />

            <div className="report-section">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Overview</h2>
                <div className="grid grid-cols-2 gap-4">
                    <table className="w-full text-sm" style={BORDER}>
                        <tbody>
                            <tr>
                                <td className="p-3 bg-gray-50 font-medium text-gray-600 w-1/2" style={BORDER}>Total Servers</td>
                                <td className="p-3" style={BORDER}>{report.total_servers}</td>
                            </tr>
                            <tr>
                                <td className="p-3 bg-gray-50 font-medium text-gray-600" style={BORDER}>Online</td>
                                <td className="p-3 text-green-600 font-medium" style={BORDER}>{report.online_servers}</td>
                            </tr>
                            <tr>
                                <td className="p-3 bg-gray-50 font-medium text-gray-600" style={BORDER}>Offline</td>
                                <td className="p-3 text-red-600 font-medium" style={BORDER}>{report.offline_servers}</td>
                            </tr>
                        </tbody>
                    </table>

                    <table className="w-full text-sm" style={BORDER}>
                        <tbody>
                            <tr>
                                <td className="p-3 bg-gray-50 font-medium text-gray-600" style={BORDER}>Total Alerts</td>
                                <td className="p-3" style={BORDER}>{report.total_alerts}</td>
                            </tr>
                            <tr>
                                <td className="p-3 bg-gray-50 font-medium text-gray-600" style={BORDER}>Avg CPU</td>
                                <td className="p-3" style={BORDER}>{report.avg_cpu_usage}%</td>
                            </tr>
                            <tr>
                                <td className="p-3 bg-gray-50 font-medium text-gray-600" style={BORDER}>Avg Memory</td>
                                <td className="p-3" style={BORDER}>{report.avg_memory_usage}%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="report-section">
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Servers</h2>
                <table className="w-full text-sm" style={BORDER}>
                    <thead>
                        <tr>
                            <th className="p-3 bg-gray-50 text-left font-medium text-gray-600" style={BORDER}>Server</th>
                            <th className="p-3 bg-gray-50 text-left font-medium text-gray-600" style={BORDER}>Status</th>
                            <th className="p-3 bg-gray-50 text-left font-medium text-gray-600" style={BORDER}>CPU</th>
                            <th className="p-3 bg-gray-50 text-left font-medium text-gray-600" style={BORDER}>Memory</th>
                            <th className="p-3 bg-gray-50 text-left font-medium text-gray-600" style={BORDER}>Disk</th>
                            <th className="p-3 bg-gray-50 text-left font-medium text-gray-600" style={BORDER}>Uptime %</th>
                            <th className="p-3 bg-gray-50 text-left font-medium text-gray-600" style={BORDER}>Last Seen</th>
                        </tr>
                    </thead>
                    <tbody>
                        {report.servers.map((s) => (
                            <tr key={s.uuid}>
                                <td className="p-3 font-medium" style={BORDER}>{s.name}</td>
                                <td className={`p-3 ${s.status === "online" ? "text-green-600" : "text-red-600"}`} style={BORDER}>
                                    {s.status}
                                </td>
                                <td className="p-3" style={BORDER}>{s.cpu_usage}%</td>
                                <td className="p-3" style={BORDER}>{s.memory_usage}%</td>
                                <td className="p-3" style={BORDER}>{s.disk_usage}%</td>
                                <td className="p-3" style={BORDER}>{s.uptime_percentage.toFixed(1)}%</td>
                                <td className="p-3" style={BORDER}>
                                    {s.last_seen ? new Date(s.last_seen).toLocaleString() : "—"}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
