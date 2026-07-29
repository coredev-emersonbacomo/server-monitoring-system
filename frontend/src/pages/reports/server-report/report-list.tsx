import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Download, Eye } from "lucide-react";
import { mockGetServerList } from "./mockServerList";
import { mockGetServerReport } from "./mockServerReport";
import { generateReportPdf } from "@/lib/generateReportPdf";

export default function ServerReportTable() {
    const navigate = useNavigate();
    const {
        data: servers,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["report-server-list"],
        queryFn: mockGetServerList,
    });

    if (isLoading) return <div className="p-8">Loading servers...</div>;
    if (error || !servers)
        return <div className="p-8">Failed to load servers.</div>;

    async function handleGenerate(uuid: string, name: string) {
        const report = await mockGetServerReport(uuid);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { metrics, ...reportData } = report;
        await generateReportPdf({
            template: "server",
            data: reportData,
            filename: `server-report-${name.toLowerCase().replace(/\s+/g, "-")}.pdf`,
        });
    }

    async function handleGenerateAll() {
        if (!servers) return;

        const totals = servers.reduce(
            (acc, s) => ({
                online: acc.online + (s.status === "online" ? 1 : 0),
                offline: acc.offline + (s.status !== "online" ? 1 : 0),
            }),
            { online: 0, offline: 0 },
        );

        await generateReportPdf({
            template: "general",
            data: {
                total_servers: servers.length,
                total_clients: 0,
                total_users: 0,
                online_servers: totals.online,
                offline_servers: totals.offline,
                total_alerts: 0,
                avg_uptime_percentage: 0,
                avg_cpu_usage: 0,
                avg_memory_usage: 0,
                avg_disk_usage: 0,
                servers_per_client: [],
                recent_clients: [],
                recent_servers: [],
                critical_alerts: 0,
                warning_alerts: 0,
                unassigned_servers: 0,
            },
            filename: "all-servers-report.pdf",
        });
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
                            <tr
                                key={server.uuid}
                                className="hover:bg-sidebar-hover/50"
                            >
                                <td className="p-3 font-medium">
                                    {server.name}
                                </td>
                                <td className="p-3">
                                    {server.client_name ?? "—"}
                                </td>
                                <td
                                    className={`p-3 ${
                                        server.status === "online"
                                            ? "text-green-600"
                                            : "text-red-600"
                                    }`}
                                >
                                    {server.status}
                                </td>
                                <td className="p-3">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() =>
                                                navigate(
                                                    `/report/servers/${server.uuid}`,
                                                )
                                            }
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg ring ring-border hover:bg-sidebar-hover text-sm"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            Preview
                                        </button>
                                        <button
                                            onClick={() =>
                                                handleGenerate(
                                                    server.uuid,
                                                    server.name,
                                                )
                                            }
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
