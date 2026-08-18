import { Link } from "react-router-dom";
import { MoreVertical, Trash2, Server, Users } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import type { ClientData } from "@/types/models";

interface ClientCardProps {
    client: ClientData;
    onDelete: (c: ClientData) => void;
}

export function ClientCard({ client, onDelete }: ClientCardProps) {
    return (
        <Link
            to={`/clients/${client.uuid}`}
            className="block rounded-lg transition-transform duration-200 hover:-translate-y-1"
        >
            <div className="relative size-full bg-card rounded-lg border border-border p-6 shadow-sm flex flex-col items-center font-sans gap-3 transition-shadow hover:shadow-md">
                <div className="absolute top-3 left-4 right-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                            <span className="text-emerald-500 leading-none text-xs">
                                {client.servers_online_count ?? 0}
                            </span>
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                            <span className="text-red-500 leading-none text-xs">
                                {client.servers_count -
                                    client.servers_online_count}
                            </span>
                        </span>
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                }}
                                className="text-muted-foreground hover:text-foreground transition-colors pl-1 pr-0 py-1 rounded-md cursor-pointer"
                                tabIndex={-1}
                            >
                                <MoreVertical className="size-4" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" sideOffset={4}>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setTimeout(() => onDelete(client), 0);
                                }}
                                className="text-destructive focus:text-destructive cursor-pointer"
                            >
                                <Trash2 className="size-3.5" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="mt-4 mb-1">
                    <img
                        src={client.banner_image_url}
                        alt={client.name}
                        className="w-20 h-20 rounded-full object-cover border border-border shadow-sm"
                    />
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground leading-none">
                    <Server className="size-4 shrink-0" />
                    {client.servers_count ?? 0}
                    <span className="flex items-center gap-1.5">
                        <Users className="size-4 shrink-0" />
                        {client.secops_count ?? 0}
                    </span>
                </div>

                <div className="text-center w-full flex flex-col items-center gap-1 min-w-0 px-2">
                    <h3 className="font-semibold text-foreground text-base tracking-tight truncate w-full" title={client.name}>
                        {client.name}
                    </h3>
                    {client.description && (
                        <p className="text-xs text-muted-foreground text-center line-clamp-2 break-words w-full">
                            {client.description}
                        </p>
                    )}
                </div>
            </div>
        </Link>
    );
}

export function SkeletonGrid() {
    return (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
                <div
                    key={i}
                    className="bg-card border border-border rounded-lg p-6 flex flex-col items-center gap-3 animate-pulse"
                >
                    <div className="w-20 h-20 rounded-full bg-muted" />
                    <div className="h-4 w-28 bg-muted rounded" />
                    <div className="h-3 w-36 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                </div>
            ))}
        </div>
    );
}
