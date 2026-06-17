import { Fragment, memo } from "react";
import type { Client } from "../data/mockDashboard";
import { ServerCard } from "./ServerCard";

interface DashboardClientCardProps {
    client: Client;
}

export const DashboardClientCard = memo(function DashboardClientCard({ client }: DashboardClientCardProps) {
    return (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
            {/* Client Banner */}
            <div
                className="relative px-6 py-8"
                style={{
                    background: `linear-gradient(to bottom, ${client.gradient.from}33, ${client.gradient.to}11, transparent)`,


                }}
            >
                <div className="relative z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                                {client.name}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {client.description}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-medium text-foreground">
                                {client.region}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {client.servers.length} Servers
                            </div>
                        </div>
                    </div>
                </div>
                {/* Fade overlay for text contrast at the bottom of the banner */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-card to-transparent" />
            </div>

            {/* Servers List */}
            <div className="divide-y divide-border/40">
                {client.servers.map((server) => (
                    <Fragment key={server.id}>
                        <ServerCard server={server} />
                    </Fragment>
                ))}
            </div>
        </div>
    );
});
