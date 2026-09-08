import { Link } from "react-router-dom";
import { Building2, UserCheck } from "lucide-react";
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
            className="block h-full rounded-lg transition-transform duration-200 hover:-translate-y-1"
        >
            <div className="relative size-full rounded-lg border bg-card border-border p-4 shadow-xs flex flex-col items-center justify-between font-sans transition-all hover:shadow-md hover:border-border/80">
                {/* Top Badge: Positioned close to top-right corner */}
                {isAssignedToCurrentUser && (
                    <div className="absolute top-2 right-2 flex items-center">
                        <span className="flex items-center gap-1 text-[9px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full shadow-xs">
                            <UserCheck className="size-2.5 shrink-0" />
                            <span>Assigned to you</span>
                        </span>
                    </div>
                )}

                {/* Top Spacer: Maintains consistent vertical spacing & alignment for all cards */}
                <div className="w-full h-3" />

                {/* Center Content: Icon, Name & Client */}
                <div className="w-full flex flex-col items-center gap-2.5 my-2">
                    <div className={cn("p-3 rounded-lg", meta.bg)}>
                        <Icon className={cn("size-5", meta.color)} />
                    </div>
                    <div className="text-center w-full flex flex-col items-center gap-1">
                        <p className="text-sm font-medium text-foreground truncate w-full" title={server.name}>
                            {server.name}
                        </p>
                        <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground w-full" title={server.client_name ?? undefined}>
                            <Building2 className="size-3 shrink-0" />
                            <span className="truncate">{server.client_name || "\u00A0"}</span>
                        </p>
                    </div>
                </div>

                {/* Bottom stack: description above the badge, same gap rhythm
                    as the center content. Fixed heights keep every card
                    aligned with or without a description. */}
                <div className="w-full flex flex-col items-center gap-2.5">
                    <p className="text-xs text-muted-foreground text-center line-clamp-2 wrap-break-word w-full min-h-8" title={server.description ?? undefined}>
                        {server.description || "\u00A0"}
                    </p>
                    <div className="w-full h-6 flex items-center justify-center">
                        <ServerStatusBadge
                            status={server.status}
                            record_status={server.record_status}
                            agent_deleted={server.agent_deleted}
                            size="sm"
                        />
                    </div>
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
