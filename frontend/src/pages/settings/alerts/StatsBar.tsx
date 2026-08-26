import { Play, Pause, RefreshCw } from "lucide-react";

interface StatsBarProps {
    stats: {
        heartbeats: number;
        monitorTicks: number;
        evaluations: number;
        notifications: number;
    };
    activeTimers: number;
    isPaused: boolean;
    onTogglePause: () => void;
    onSync: () => void;
}

export function StatsBar({
    stats,
    activeTimers,
    isPaused,
    onTogglePause,
    onSync,
}: StatsBarProps) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-card border border-border/60 rounded-xl shadow-sm">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                    </span>
                    <span className="text-sm font-semibold">
                        WebSockets Connected
                    </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div>
                        Heartbeats:{" "}
                        <span className="font-mono text-foreground font-semibold">
                            {stats.heartbeats}
                        </span>
                    </div>
                    <div>
                        System Sweeps:{" "}
                        <span className="font-mono text-foreground font-semibold">
                            {stats.monitorTicks}
                        </span>
                    </div>
                    <div>
                        Active Timers:{" "}
                        <span className="font-mono text-foreground font-semibold">
                            {activeTimers}
                        </span>
                    </div>
                    <div>
                        Notifications:{" "}
                        <span className="font-mono text-foreground font-semibold">
                            {stats.notifications}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <button
                    onClick={onTogglePause}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                >
                    {isPaused ? (
                        <Play className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                        <Pause className="w-3.5 h-3.5 text-amber-500" />
                    )}
                    {isPaused ? "Resume Pipeline" : "Pause Stream"}
                </button>
                <button
                    onClick={onSync}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Sync State
                </button>
            </div>
        </div>
    );
}
