// File path: frontend/src/pages/reports/server-report/server-report.tsx
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import jwtClient from "@/api/jwtClient";
import type { ServerReport } from "../reportTypes";
import { ReportHeader } from "../ReportHeader";
export default function ServerReportPage({ uuidOverride }: { uuidOverride?: string } = {}) {
    const { uuid: paramUuid } = useParams<{ uuid: string }>();
    const uuid = uuidOverride ?? paramUuid;

    const { data: report, isLoading, error } = useQuery({
        queryKey: ["server-report", uuid],
        queryFn: async () => {
            const { data } = await jwtClient.get(`/v1/servers/${uuid}/report`, {
                params: { hours: 24 },
            });
            return data as ServerReport;
        },
        enabled: !!uuid,
        refetchInterval: 30_000, // keep metrics fresh
    });

    if (isLoading) return <div className="p-8">Loading report...</div>;
    if (error || !report) return <div className="p-8">Failed to load report.</div>;

    const chartData = report.metrics.map((m) => ({
        time: new Date(m.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        }),
        cpu: m.cpu_usage,
        memory: m.memory_usage,
        disk: m.disk_usage,
        networkIn: m.network_rbytes,
        networkOut: m.network_tbytes,
    }));

    return (
        <div className="flex flex-col gap-6">
            <ReportHeader
                title={report.name}
                subtitle="Server-specific report"
            />
            {/* A. Server Info */}
            <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Server Information</h2>
                <table className="w-full text-sm" style={{ border: "1px solid #d1d5db" }}>
                    <tbody>
                        <tr>
                            <td className="p-3 bg-gray-50 font-medium text-gray-600 w-1/2" style={{ border: "1px solid #d1d5db" }}>Server</td>
                            <td className="p-3" style={{ border: "1px solid #d1d5db" }}>{report.name}</td>
                        </tr>
                        <tr>
                            <td className="p-3 bg-gray-50 font-medium text-gray-600" style={{ border: "1px solid #d1d5db" }}>Client</td>
                            <td className="p-3" style={{ border: "1px solid #d1d5db" }}>{report.client_name ?? "—"}</td>
                        </tr>
                        <tr>
                            <td className="p-3 bg-gray-50 font-medium text-gray-600" style={{ border: "1px solid #d1d5db" }}>OS</td>
                            <td className="p-3" style={{ border: "1px solid #d1d5db" }}>{report.operating_system ?? "—"}</td>
                        </tr>
                        <tr>
                            <td className="p-3 bg-gray-50 font-medium text-gray-600" style={{ border: "1px solid #d1d5db" }}>Status</td>
                            <td className="p-3 capitalize" style={{ border: "1px solid #d1d5db" }}>{report.status}</td>
                        </tr>
                        <tr>
                            <td className="p-3 bg-gray-50 font-medium text-gray-600" style={{ border: "1px solid #d1d5db" }}>CPU</td>
                            <td className="p-3" style={{ border: "1px solid #d1d5db" }}>{report.cpu_model ?? "—"}</td>
                        </tr>
                        <tr>
                            <td className="p-3 bg-gray-50 font-medium text-gray-600" style={{ border: "1px solid #d1d5db" }}>Cores</td>
                            <td className="p-3" style={{ border: "1px solid #d1d5db" }}>{report.cpu_cores ?? "—"}</td>
                        </tr>
                        <tr>
                            <td className="p-3 bg-gray-50 font-medium text-gray-600" style={{ border: "1px solid #d1d5db" }}>RAM</td>
                            <td className="p-3" style={{ border: "1px solid #d1d5db" }}>{report.ram ?? "—"}</td>
                        </tr>
                        <tr>
                            <td className="p-3 bg-gray-50 font-medium text-gray-600" style={{ border: "1px solid #d1d5db" }}>Disk</td>
                            <td className="p-3" style={{ border: "1px solid #d1d5db" }}>{report.disk ?? "—"}</td>
                        </tr>
                        <tr>
                            <td className="p-3 bg-gray-50 font-medium text-gray-600" style={{ border: "1px solid #d1d5db" }}>Last Seen</td>
                            <td className="p-3" style={{ border: "1px solid #d1d5db" }}>
                                {report.last_seen ? new Date(report.last_seen).toLocaleString() : "—"}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            {/* B. Metrics graphs */}
            {/* B. Metrics Summary */}
            <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Metrics Summary (Last 24 Hours)</h2>
                <table className="w-full text-sm" style={{ border: "1px solid #d1d5db" }}>
                    <thead>
                        <tr>
                            <th className="p-3 bg-gray-50 text-left font-medium text-gray-600" style={{ border: "1px solid #d1d5db" }}>Metric</th>
                            <th className="p-3 bg-gray-50 text-left font-medium text-gray-600" style={{ border: "1px solid #d1d5db" }}>Min</th>
                            <th className="p-3 bg-gray-50 text-left font-medium text-gray-600" style={{ border: "1px solid #d1d5db" }}>Max</th>
                            <th className="p-3 bg-gray-50 text-left font-medium text-gray-600" style={{ border: "1px solid #d1d5db" }}>Average</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(["cpu", "memory", "disk"] as const).map((key) => {
                            const values = chartData.map((d) => Number(d[key]));
                            const min = values.length ? Math.min(...values) : 0;
                            const max = values.length ? Math.max(...values) : 0;
                            const avg = values.length
                                ? values.reduce((a, b) => a + b, 0) / values.length
                                : 0;
                            const labels = { cpu: "CPU Usage", memory: "Memory Usage", disk: "Disk Usage" };

                            return (
                                <tr key={key}>
                                    <td className="p-3 font-medium" style={{ border: "1px solid #d1d5db" }}>{labels[key]}</td>
                                    <td className="p-3" style={{ border: "1px solid #d1d5db" }}>{min.toFixed(1)}%</td>
                                    <td className="p-3" style={{ border: "1px solid #d1d5db" }}>{max.toFixed(1)}%</td>
                                    <td className="p-3" style={{ border: "1px solid #d1d5db" }}>{avg.toFixed(1)}%</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            {/* C. Uptime */}
            <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-2">Uptime</h2>
                <table className="w-full text-sm" style={{ border: "1px solid #d1d5db" }}>
                    <tbody>
                        <tr>
                            <td className="p-3 bg-gray-50 font-medium text-gray-600 w-1/3" style={{ border: "1px solid #d1d5db" }}>Uptime %</td>
                            <td className="p-3 w-1/3" style={{ border: "1px solid #d1d5db" }}>{report.uptime.uptime_percentage}%</td>
                            <td className="p-3 bg-gray-50 font-medium text-gray-600 w-1/3" style={{ border: "1px solid #d1d5db" }}>Uptime (hrs)</td>
                            <td className="p-3 w-1/3" style={{ border: "1px solid #d1d5db" }}>
                                {report.uptime.uptime_hours}hrs/{report.uptime.range_hours}hrs
                            </td>
                        </tr>
                        <tr>
                            <td className="p-3 bg-gray-50 font-medium text-gray-600 w-1/3" style={{ border: "1px solid #d1d5db" }}>Outages</td>
                            <td className="p-3" colSpan={3} style={{ border: "1px solid #d1d5db" }}>
                                {report.uptime.last_downtime
                                    ? new Date(report.uptime.last_downtime).toLocaleString()
                                    : "None recorded"}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
}
