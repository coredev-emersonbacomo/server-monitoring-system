import { useQuery } from "@tanstack/react-query";
import {
    PieChart,
    Cell,
    Pie,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { mockGetGeneralReport } from "./mockGeneralReport";
import { ReportHeader } from "../ReportHeader";

const CLIENT_COLORS = [
    "#3b82f6", "#ef4444", "#f59e0b", "#10b981",
    "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

const BORDER = { border: "1px solid #d1d5db" };


export default function GeneralReport() {
    const { data: report, isLoading, error } = useQuery({
        queryKey: ["general-report"],
        queryFn: mockGetGeneralReport, // TODO: swap to real API
    });

    if (isLoading) return <div className="p-8">Loading global report...</div>;
    if (error || !report) return <div className="p-8">Failed to load report.</div>;

    const assignmentData = [
        { name: "Assigned", value: report.total_servers - report.unassigned_servers },
        { name: "Unassigned", value: report.unassigned_servers },
    ];

    return (
        <div className="report-section">
            <div className=" flex flex-col gap-6">
                <ReportHeader
                    title="Global Report"
                    subtitle="System-wide overview of all clients and servers"
                />

                {/* Overview */}
                <div>
                    <h2 className="text-sm font-semibold text-gray-700 mb-2">Overview</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <table className="w-full text-sm" style={BORDER}>
                            <tbody className="text-black">
                                <tr>
                                    <td className="p-3 bg-gray-50 font-medium  w-[50%]" style={BORDER}>Total Servers</td>
                                    <td className="p-3 text-black" style={BORDER}>{report.total_servers}</td>
                                </tr>
                                <tr>
                                    <td className="p-3 bg-gray-50 font-medium " style={BORDER}>Total Clients</td>
                                    <td className="p-3" style={BORDER}>{report.total_clients}</td>
                                </tr>
                                <tr>
                                    <td className="p-3 bg-gray-50 font-medium " style={BORDER}>Total Users</td>
                                    <td className="p-3" style={BORDER}>{report.total_users}</td>
                                </tr>
                            </tbody>
                        </table>

                        <table className="w-full text-sm" style={BORDER}>
                            <tbody className="text-black">
                                <tr>
                                    <td className="p-3 bg-gray-50 font-medium " style={BORDER}>Online</td>
                                    <td className="p-3 text-green-600 font-medium" style={BORDER}>{report.online_servers}</td>
                                </tr>
                                <tr>
                                    <td className="p-3 bg-gray-50 font-medium " style={BORDER}>Offline</td>
                                    <td className="p-3 text-red-600 font-medium" style={BORDER}>{report.offline_servers}</td>
                                </tr>
                                <tr>
                                    <td className="p-3 bg-gray-50 font-medium " style={BORDER}>Total Alerts</td>
                                    <td className="p-3" style={BORDER}>{report.total_alerts}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Servers per Client */}
                <div>
                    <h2 className="text-sm font-semibold text-gray-700 mb-2">Servers per Client</h2>
                    <div className="p-4" style={BORDER}>
                        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3 max-h-24 overflow-y-auto">
                            {report.servers_per_client.map((c, i) => (
                                <li
                                    key={c.client_name}
                                    className="flex items-center gap-1.5 text-xs text-black"
                                >
                                    <span
                                        className="size-2 rounded-full shrink-0"
                                        style={{ backgroundColor: CLIENT_COLORS[i % CLIENT_COLORS.length] }}
                                    />
                                    {c.client_name}
                                </li>
                            ))}
                        </ul>
                        <ResponsiveContainer width="50%" height={360} initialDimension={{ width: 750, height: 360 }}>
                            <PieChart>
                                <Pie
                                    data={report.servers_per_client}
                                    dataKey="server_count"
                                    nameKey="client_name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={140}
                                    isAnimationActive={false}
                                >
                                    {report.servers_per_client.map((_, i) => (
                                        <Cell key={i} fill={CLIENT_COLORS[i % CLIENT_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value, name) => [value, name]} />
                            </PieChart>
                        </ResponsiveContainer>

                        <table className="w-full text-sm mt-4" style={BORDER}>
                            <thead>
                                <tr>
                                    <th className="p-3 bg-gray-50 text-left font-medium text-black" style={BORDER}>Clients</th>
                                    <th className="p-3 bg-gray-50 text-left font-medium text-black" style={BORDER}>No. of Servers</th>
                                    <th className="p-3 bg-gray-50 text-left font-medium text-black" style={BORDER}>Percentage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {report.servers_per_client.map((c) => (
                                    <tr key={c.client_name} className="text-black">
                                        <td className="p-3" style={BORDER}>{c.client_name}</td>
                                        <td className="p-3" style={BORDER}>{c.server_count}</td>
                                        <td className="p-3" style={BORDER}>
                                            {report.total_servers > 0
                                                ? `${((c.server_count / report.total_servers) * 100).toFixed(1)}%`
                                                : "0%"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Server Assignment */}
                <div>
                    <h2 className="text-sm font-semibold text-gray-700 mb-2">
                        Server Assignment
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                            ({report.unassigned_servers} unassigned)
                        </span>
                    </h2>
                    <div className="p-4" style={BORDER}>
                        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
                            {assignmentData.map((a, i) => (
                                <li
                                    key={a.name}
                                    className="flex items-center gap-1.5 text-xs text-muted-foreground"
                                >
                                    <span
                                        className="size-2 rounded-full shrink-0"
                                        style={{ backgroundColor: i === 0 ? "#3b82f6" : "#ef4444" }}
                                    />
                                    {a.name}
                                </li>
                            ))}
                        </ul>
                        <ResponsiveContainer width="50%" height={360} className="mx-auto" initialDimension={{ width: 450, height: 360 }}>
                            <PieChart>
                                <Pie
                                    data={assignmentData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={140}
                                    isAnimationActive={false}
                                >
                                    <Cell fill="#3b82f6" />
                                    <Cell fill="#ef4444" />
                                </Pie>
                                <Tooltip formatter={(value, name) => [value, name]} />
                            </PieChart>
                        </ResponsiveContainer>

                        <table className="w-full text-sm mt-4" style={BORDER}>
                            <thead>
                                <tr>
                                    <th className="p-3 bg-gray-50 text-left font-medium text-gray-600" style={BORDER}>Category</th>
                                    <th className="p-3 bg-gray-50 text-left font-medium text-gray-600" style={BORDER}>No. of Servers</th>
                                    <th className="p-3 bg-gray-50 text-left font-medium text-gray-600" style={BORDER}>Percentage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {assignmentData.map((a) => (
                                    <tr key={a.name}>
                                        <td className="p-3" style={BORDER}>{a.name}</td>
                                        <td className="p-3" style={BORDER}>{a.value}</td>
                                        <td className="p-3" style={BORDER}>
                                            {report.total_servers > 0
                                                ? `${((a.value / report.total_servers) * 100).toFixed(1)}%`
                                                : "0%"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* System Health */}
                <div>
                    <h2 className="text-sm font-semibold text-gray-700 mb-2">System Health</h2>
                    <table className="w-full text-sm" style={BORDER}>
                        <tbody>
                            <tr>
                                <td className="p-3 bg-gray-50 font-medium text-gray-600 w-[50%]" style={BORDER}>Avg Uptime</td>
                                <td className="p-3" style={BORDER}>{report.avg_uptime_percentage}%</td>
                            </tr>
                            <tr>
                                <td className="p-3 bg-gray-50 font-medium text-gray-600" style={BORDER}>Avg CPU</td>
                                <td className="p-3" style={BORDER}>{report.avg_cpu_usage}%</td>
                            </tr>
                            <tr>
                                <td className="p-3 bg-gray-50 font-medium text-gray-600" style={BORDER}>Avg Memory</td>
                                <td className="p-3" style={BORDER}>{report.avg_memory_usage}%</td>
                            </tr>
                            <tr>
                                <td className="p-3 bg-gray-50 font-medium text-gray-600 w-[50%]" style={BORDER}>Avg Disk</td>
                                <td className="p-3" style={BORDER}>{report.avg_disk_usage}%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Recently Added */}
                <div>
                    <h2 className="text-sm font-semibold text-gray-700 mb-2">Recently Added Clients</h2>
                    <table className="w-full text-sm" style={BORDER}>
                        <tbody>
                            {report.recent_clients.map((c) => (
                                <tr key={c.name}>
                                    <td className="p-3 font-medium w-[50%]" style={BORDER}>{c.name}</td>
                                    <td className="p-3 text-black" style={BORDER}>
                                        {new Date(c.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div>
                    <h2 className="text-sm font-semibold text-gray-700 mb-2">Recently Added Servers</h2>
                    <table className="w-full text-sm" style={BORDER}>
                        <tbody>
                            {report.recent_servers.map((s) => (
                                <tr key={s.name}>
                                    <td className="p-3 font-medium w-[50%]" style={BORDER}>{s.name}</td>
                                    <td className="p-3 text-black" style={BORDER}>
                                        {new Date(s.created_at).toLocaleDateString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {/* Alerts Summary */}
                <div>
                    <h2 className="text-sm font-semibold text-gray-700 mb-2">Alerts Summary</h2>
                    <table className="w-full text-sm" style={BORDER}>
                        <tbody>
                            <tr>
                                <td className="p-3 bg-gray-50 font-medium text-gray-600 w-[50%]" style={BORDER}>Total Alerts</td>
                                <td className="p-3" style={BORDER}>{report.total_alerts}</td>
                            </tr>
                            <tr>
                                <td className="p-3 bg-gray-50 font-medium text-gray-600" style={BORDER}>Critical</td>
                                <td className="p-3 text-red-600 font-medium" style={BORDER}>{report.critical_alerts}</td>
                            </tr>
                            <tr>
                                <td className="p-3 bg-gray-50 font-medium text-gray-600" style={BORDER}>Warning</td>
                                <td className="p-3 text-yellow-600 font-medium" style={BORDER}>{report.warning_alerts}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

}
