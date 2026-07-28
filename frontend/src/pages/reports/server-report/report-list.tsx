import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Download, Eye } from "lucide-react";
import { mockGetServerList } from "./mockServerList";
import { mockGetServerReport } from "./mockServerReport";
import { generateReportPdf } from "@/lib/generateReportPdf";


export default function ServerReportTable() {
    const navigate = useNavigate();
    const { data: servers, isLoading, error } = useQuery({
        queryKey: ["report-server-list"],
        queryFn: mockGetServerList, // TODO: swap to real API
    });

    if (isLoading) return <div className="p-8">Loading servers...</div>;
    if (error || !servers) return <div className="p-8">Failed to load servers.</div>;

    async function handleGenerate(uuid: string, name: string) {
        const report = await mockGetServerReport(uuid); // TODO: swap to real API
        generateReportPdf(
            `Server Report — ${report.name}`,
            [
                {
                    title: "Server Info",
                    fields: [
                        { label: "Client", value: report.client_name ?? "—" },
                        { label: "OS", value: report.operating_system ?? "—" },
                        { label: "Status", value: report.status },
                        { label: "CPU", value: report.cpu_model ?? "—" },
                        { label: "RAM", value: report.ram ?? "—" },
                        { label: "Last Seen", value: report.last_seen ?? "—" },
                    ],
                },
                {
                    title: "Uptime",
                    fields: [
                        { label: "Uptime %", value: `${report.uptime.uptime_percentage}%` },
                        { label: "Outages", value: String(report.uptime.outage_count) },
                        { label: "Last Downtime", value: report.uptime.last_downtime ?? "None recorded" },
                    ],
                },
            ],
            `server-report-${name.toLowerCase().replace(/\s+/g, "-")}.pdf`,
        );
    }
    function handleGenerateAll() {
        if (!servers) return;

        const totals = servers.reduce(
            (acc, s) => ({
                online: acc.online + (s.status === "online" ? 1 : 0),
                offline: acc.offline + (s.status !== "online" ? 1 : 0),
            }),
            { online: 0, offline: 0 },
        );

        generateReportPdf(
            "All Servers Report",
            [
                {
                    title: "Summary",
                    fields: [
                        { label: "Total Servers", value: String(servers.length) },
                        { label: "Online", value: String(totals.online) },
                        { label: "Offline", value: String(totals.offline) },
                    ],
                },
                ...servers.map((s) => ({
                    title: s.name,
                    fields: [
                        { label: "Client", value: s.client_name ?? "—" },
                        { label: "Status", value: s.status },
                        { label: "Last Seen", value: s.last_seen ?? "—" },
                    ],
                })),
            ],
            "all-servers-report.pdf",
        );
    }
    return (
        <div className="flex flex-col gap-3">
            <div className="flex justify-end">
                <button
                    onClick={handleGenerateAll}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-sm"
                >
                    <Download className="w-3.5 h-3.5" />
                    Generate Report (All Servers)
                </button>
            </div>

            <div className="overflow-x-auto rounded-xl ring ring-border">
                <table className="w-full text-sm">
                    <thead className="bg-sidebar-hover text-muted-foreground text-left">
                        <tr>
                            <th className="p-3">Server</th>
                            <th className="p-3">Client</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {servers.map((server) => (
                            <tr key={server.uuid} className="hover:bg-sidebar-hover/50">
                                <td className="p-3 font-medium">{server.name}</td>
                                <td className="p-3">{server.client_name ?? "—"}</td>
                                <td className={`p-3 ${server.status === "online" ? "text-green-600" : "text-red-600"}`}>
                                    {server.status}
                                </td>
                                <td className="p-3">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => navigate(`/report/servers/${server.uuid}`)}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg ring ring-border hover:bg-sidebar-hover text-sm"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            Preview
                                        </button>
                                        <button
                                            onClick={() => handleGenerate(server.uuid, server.name)}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 text-sm"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            Generate Report
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}