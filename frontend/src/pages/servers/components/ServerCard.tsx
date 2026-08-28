import { Link } from "react-router-dom";
import { UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
    STATUS_CONFIG,
    resolveServerStatusKey,
} from "@/constants/serverStatus";
import { ServerStatusBadge } from "@/components/ServerStatusBadge";
import type { ServerData } from "@/types/models";

interface ServerCardProps {
    server: ServerData;
}

export function ServerCard({ server }: ServerCardProps) {
    const effectiveStatus = resolveServerStatusKey(
        server.status,
        server.record_status,
        server.agent_deleted,
    );
    const meta = STATUS_CONFIG[effectiveStatus];
    const Icon = meta.icon;
    const isAssignedToCurrentUser = Boolean(server.is_assigned_to_current_user);

    return (
        <Link
            to={`/servers/${server.uuid}?client=all`}
            className="block rounded-lg transition-transform duration-200 hover:-translate-y-1"
        >
            <div className="relative size-full rounded-lg border bg-card border-border p-6 shadow-xs flex flex-col items-center font-sans gap-3 transition-all hover:shadow-md hover:border-border/80">
                {isAssignedToCurrentUser && (
                    <div className="absolute top-3 right-4 flex items-center">
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full shadow-xs">
                            <UserCheck className="size-3 shrink-0" />
                            <span>Assigned to you</span>
                        </span>
                    </div>
                )}

                <div
                    className={cn(
                        "p-3 rounded-lg",
                        isAssignedToCurrentUser ? "mt-8" : "",
                        meta.bg,
                    )}
                >
                    <Icon className={cn("size-5", meta.color)} />
                </div>
                <div className="text-center w-full flex flex-col items-center gap-1.5">
                    <p className="text-sm font-medium text-foreground truncate w-full">
                        {server.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate w-full">
                        {server.client_name}
                    </p>
                    <ServerStatusBadge
                        status={server.status}
                        record_status={server.record_status}
                        agent_deleted={server.agent_deleted}
                        size="sm"
                    />
                </div>
            </div>
        </Link>
    );
}

export function SkeletonGrid() {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4 pt-4">
            {Array.from({ length: 6 }).map((_, i) => (
                <div
                    key={i}
                    className="h-48 bg-card border border-border rounded-lg animate-pulse"
                />
            ))}
        </div>
    );
}
