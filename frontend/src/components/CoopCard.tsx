import { memo } from "react";
import type { Coop } from "../data/mockDashboard";

interface CoopCardProps {
    coop: Coop;
}

export const CoopCard = memo(function CoopCard({ coop }: CoopCardProps) {
    return (
        <div className="rounded-xl border border-border/60 bg-card overflow-hidden shadow-sm cursor-pointer hover:shadow-md transition-shadow">
            <div
                className="relative px-5 py-6"
                style={{
                    background: `linear-gradient(to bottom, ${coop.gradient.from}33, ${coop.gradient.to}11, transparent)`,
                }}
            >
                <div className="relative z-10">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-foreground tracking-tight">
                            {coop.name}
                        </h3>
                        <div className="text-right">
                            <div className="text-xs font-medium text-foreground">
                                {coop.region}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                                {coop.servers.length} Servers
                            </div>
                        </div>
                    </div>
                </div>
                <div className="absolute inset-x-0 bottom-0 h-3/4 bg-linear-to-t from-card to-transparent" />
            </div>

            <div className="px-5 py-3 text-sm text-muted-foreground border-t border-border/40">
                No recent updates or warnings
            </div>
        </div>
    );
});
