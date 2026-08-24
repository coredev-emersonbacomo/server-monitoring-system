import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { STATUS_META } from "../constants/statusConfig";

interface ServerGridCardProps {
    server: {
        uuid: string;
        name: string;
        client_name?: string;
        record_status?: string;
        status?: string;
        agent_deleted?: boolean;
    };
}

export function ServerGridCard({ server }: ServerGridCardProps) {
    const isArchived =
        server.record_status === "archived" || server.status === "archived";
    const effectiveStatus = isArchived
        ? "archived"
        : server.status ?? "offline";
    const meta = STATUS_META[effectiveStatus] ?? STATUS_META.offline;
    const Icon = meta.icon;

    return (
        <Link
            to={`/servers/${server.uuid}?client=all`}
            className="block rounded-lg transition-transform duration-200 hover:-translate-y-1"
        >
            <div className="relative size-full bg-card rounded-lg border border-border p-6 shadow-sm flex flex-col items-center font-sans gap-3 transition-shadow hover:shadow-md">
                <div className={cn("p-3 rounded-lg", meta.bg)}>
                    <Icon className={cn("size-5", meta.color)} />
                </div>
                <div className="text-center w-full flex flex-col items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground truncate w-full">
                        {server.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate w-full">
                        {server.client_name}
                    </p>
                    <span
                        className={cn(
                            "text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded text-center",
                            meta.color,
                            meta.bg,
                        )}
                    >
                        {effectiveStatus.replace(/_/g, " ")}
                    </span>
                </div>
            </div>
        </Link>
    );
}
