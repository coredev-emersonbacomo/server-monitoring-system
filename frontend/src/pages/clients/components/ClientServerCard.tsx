import { Link } from "react-router-dom";
import { Monitor, Globe, Cpu, MemoryStick } from "lucide-react";
import type { ServerData } from "@/types/models";
import { ServerStatusBadge } from "@/components/ServerStatusBadge";

export default function ClientServerCard({ server }: { server: ServerData }) {
    return (
        <Link
            to={`/servers/${server.uuid}`}
            className="bg-card border border-border/60 rounded-xl shadow-sm p-5 flex flex-col gap-3 transition-shadow hover:shadow-md group"
        >
            <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Monitor className="w-5 h-5 text-primary" />
                </div>
                <ServerStatusBadge
                    status={server.status}
                    record_status={server.record_status}
                    agent_deleted={server.agent_deleted}
                    size="sm"
                />
            </div>

            <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {server.name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{server.host_name}</p>
                {server.description && (
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words">
                        {server.description}
                    </p>
                )}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {server.operating_system && (
                    <span className="flex items-center gap-1">
                        <Globe size={11} />
                        {server.operating_system}
                    </span>
                )}
            </div>

            {(server.cpu_cores || server.ram) && (
                <div className="flex gap-3 text-xs text-muted-foreground pt-1 border-t border-border/40">
                    {server.cpu_cores && (
                        <span className="flex items-center gap-1">
                            <Cpu size={11} />
                            {server.cpu_cores} cores
                        </span>
                    )}
                    {server.ram && (
                        <span className="flex items-center gap-1">
                            <MemoryStick size={11} />
                            {server.ram.toUpperCase().includes("B") ? server.ram : `${server.ram} GB`}
                        </span>
                    )}
                </div>
            )}
        </Link>
    );
}
