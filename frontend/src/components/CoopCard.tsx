import { Fragment, memo } from "react";
import type { Coop } from "../data/mockDashboard";
import { ServerCard } from "./ServerCard";

interface CoopCardProps {
    coop: Coop;
}

export const CoopCard = memo(function CoopCard({ coop }: CoopCardProps) {
    return (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm">
            {/* Coop Banner */}
            <div
                className="relative px-6 py-8"
                style={{
                    background: `linear-gradient(to bottom, ${coop.gradient.from}33, ${coop.gradient.to}11, transparent)`,
                }}
            >
                <div className="relative z-10">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
                                {coop.name}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {coop.description}
                            </p>
                        </div>
                        <div className="text-right">
                            <div className="text-sm font-medium text-foreground">
                                {coop.region}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {coop.servers.length} Servers
                            </div>
                        </div>
                    </div>
                </div>
                {/* Fade overlay for text contrast at the bottom of the banner */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-linear-to-t from-card to-transparent" />
            </div>

            {/* Servers List */}
            <div className="divide-y divide-border/40">
                {coop.servers.map((server) => (
                    <Fragment key={server.id}>
                        <ServerCard server={server} />
                    </Fragment>
                ))}
            </div>
        </div>
    );
});
