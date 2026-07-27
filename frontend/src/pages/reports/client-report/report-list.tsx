import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Download, Eye } from "lucide-react";
import { mockGetClientList } from "./mockClientList";
import { mockGetClientReport } from "./mockClientReport";
import { generateReportPdf } from "@/lib/generateReportPdf";
export default function ClientReportTable() {
    const navigate = useNavigate();
    const { data: clients, isLoading, error } = useQuery({
        queryKey: ["client-report-list"],
        queryFn: mockGetClientList, // TODO: swap to real API
    });

    if (isLoading) return <div className="p-8">Loading clients...</div>;
    if (error || !clients) return <div className="p-8">Failed to load clients.</div>;

    async function handleGenerate(uuid: string, name: string) {
        const report = await mockGetClientReport(uuid); // TODO: swap to real API
        generateReportPdf(
            `Client Report — ${report.name}`,
            [
                {
                    title: "Summary",
                    fields: [
                        { label: "Total Servers", value: String(report.total_servers) },
                        { label: "Online", value: String(report.online_servers) },
                        { label: "Offline", value: String(report.offline_servers) },
                        { label: "Avg CPU", value: `${report.avg_cpu_usage}%` },
                        { label: "Avg Memory", value: `${report.avg_memory_usage}%` },
                        { label: "Total Alerts", value: String(report.total_alerts) },
                    ],
                },
                {
                    title: "Servers",
                    fields: report.servers.map((s) => ({
                        label: s.name,
                        value: `${s.status} — CPU ${s.cpu_usage}% / Mem ${s.memory_usage}%`,
                    })),
                },
            ],
            `client-report-${name.toLowerCase().replace(/\s+/g, "-")}.pdf`,
        );
    }
    function handleGenerateAll() {
        if (!clients) return;

        const totals = clients.reduce(
            (acc, c) => ({
                servers: acc.servers + c.total_servers,
                online: acc.online + c.online_servers,
                offline: acc.offline + c.offline_servers,
            }),
            { servers: 0, online: 0, offline: 0 },
        );

        generateReportPdf(
            "All Clients Report",
            [
                {
                    title: "Summary",
                    fields: [
                        { label: "Total Clients", value: String(clients.length) },
                        { label: "Total Servers", value: String(totals.servers) },
                        { label: "Online", value: String(totals.online) },
                        { label: "Offline", value: String(totals.offline) },
                    ],
                },
                ...clients.map((c) => ({
                    title: c.name,
                    fields: [
                        { label: "Total Servers", value: String(c.total_servers) },
                        { label: "Online", value: String(c.online_servers) },
                        { label: "Offline", value: String(c.offline_servers) },
                    ],
                })),
            ],
            "all-clients-report.pdf",
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
                            <tr key={client.uuid} className="hover:bg-sidebar-hover/50">
                                <td className="p-3 font-medium">{client.name}</td>
                                <td className="p-3">{client.total_servers}</td>
                                <td className="p-3 text-green-600">{client.online_servers}</td>
                                <td className="p-3 text-red-600">{client.offline_servers}</td>
                                <td className="p-3">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => navigate(`/report/clients/${client.uuid}`)}
                                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg ring ring-border hover:bg-sidebar-hover text-sm"
                                        >
                                            <Eye className="w-3.5 h-3.5" />
                                            Preview
                                        </button>
                                        <button
                                            onClick={() => handleGenerate(client.uuid, client.name)}
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