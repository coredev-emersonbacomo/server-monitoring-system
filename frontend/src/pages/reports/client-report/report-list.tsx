import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Download, Eye } from "lucide-react";
import { mockGetClientList } from "./mockClientList";
import { mockGetClientReport } from "./mockClientReport";
import { generateReportPdf } from "@/lib/generateReportPdf";

export default function ClientReportTable() {
    const navigate = useNavigate();
    const {
        data: clients,
        isLoading,
        error,
    } = useQuery({
        queryKey: ["client-report-list"],
        queryFn: mockGetClientList,
    });

    if (isLoading) return <div className="p-8">Loading clients...</div>;
    if (error || !clients)
        return <div className="p-8">Failed to load clients.</div>;

    async function handleGenerate(uuid: string, name: string) {
        const report = await mockGetClientReport(uuid);
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { metrics, ...reportData } = report;
        await generateReportPdf({
            template: "client",
            data: reportData,
            filename: `client-report-${name.toLowerCase().replace(/\s+/g, "-")}.pdf`,
        });
    }

    async function handleGenerateAll() {
        if (!clients) return;

        const totals = clients.reduce(
            (acc, c) => ({
                servers: acc.servers + c.total_servers,
                online: acc.online + c.online_servers,
                offline: acc.offline + c.offline_servers,
            }),
            { servers: 0, online: 0, offline: 0 },
        );

        await generateReportPdf({
            template: "general",
            data: {
                total_servers: totals.servers,
                total_clients: clients.length,
                total_users: 0,
                online_servers: totals.online,
                offline_servers: totals.offline,
                total_alerts: 0,
                avg_uptime_percentage: 0,
                avg_cpu_usage: 0,
                avg_memory_usage: 0,
                avg_disk_usage: 0,
                servers_per_client: clients.map((c) => ({
                    client_name: c.name,
                    server_count: c.total_servers,
                })),
                recent_clients: [],
                recent_servers: [],
                critical_alerts: 0,
                warning_alerts: 0,
                unassigned_servers: 0,
            },
            filename: "all-clients-report.pdf",
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
                    Generate Report (All Clients)
                </button>
            </div>

            <div className="overflow-x-auto rounded-xl ring ring-border">
                <table className="w-full text-sm">
                    <thead className="bg-sidebar-hover text-muted-foreground text-left">
                        <tr>
                            <th className="p-3">Client</th>
                            <th className="p-3">Total Servers</th>
                            <th className="p-3">Online</th>
                            <th className="p-3">Offline</th>
                            <th className="p-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                        {clients.map((client) => (
                            <tr
                                key={client.uuid}
                                className="hover:bg-sidebar-hover/50"
                            >
                                <td className="p-3 font-medium">
                                    {client.name}
                                </td>
                                <td className="p-3">{client.total_servers}</td>
                                <td className="p-3 text-green-600">
                                    {client.online_servers}
                                </td>
                                <td className="p-3 text-red-600">
                                    {client.offline_servers}
                                </td>
                                <td className="p-3">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() =>
                                                navigate(
                                                    `/report/clients/${client.uuid}`,
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
                                                    client.uuid,
                                                    client.name,
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
