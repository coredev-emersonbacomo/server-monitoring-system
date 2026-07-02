import { Link } from "react-router-dom";
import { Monitor, Network, Globe, Cpu, MemoryStick } from "lucide-react";
import type { ServerData } from "@/types/models";

export default function ServerCard({ server }: { server: ServerData }) {
    return (
        <Link
            to={`/servers/${server.uuid}`}
            className="bg-card border border-border/60 rounded-xl shadow-sm p-5 flex flex-col gap-3 transition-shadow hover:shadow-md group"
        >
            <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Monitor className="w-5 h-5 text-primary" />
                </div>
                <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Online
                </span>
            </div>

            <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {server.server_name}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {server.host_name}
                </p>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1 font-mono">
                    <Network size={11} />
                    {server.external_ip}
                </span>
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
                            {server.ram} GB
                        </span>
                    )}
                </div>
            )}
        </Link>
    );
}
