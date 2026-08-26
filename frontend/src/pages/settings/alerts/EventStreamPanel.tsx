import { Radio, Eye } from "lucide-react";
import type { TelemetryEvent } from "./types";

interface EventStreamPanelProps {
    events: TelemetryEvent[];
    onOpenDetails: (event: TelemetryEvent) => void;
}

export function EventStreamPanel({ events, onOpenDetails }: EventStreamPanelProps) {
    return (
        <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Radio className="w-4 h-4 text-primary animate-pulse" />
                    Live Backend Event Stream
                </h3>
                <span className="text-xs text-muted-foreground font-mono">
                    showing last 30 events
                </span>
            </div>

            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto font-mono text-xs">
                {events.length === 0 ? (
                    <p className="text-muted-foreground text-center py-4">
                        Waiting for backend pipeline events...
                    </p>
                ) : (
                    events.map((e) => (
                        <div
                            key={e.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/40"
                        >
                            <div className="flex items-center gap-2">
                                <span className="text-slate-500">
                                    {new Date(e.timestamp).toLocaleTimeString()}
                                </span>
                                <span className="font-semibold text-primary">
                                    [{e.type}]
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => onOpenDetails(e)}
                                    className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors"
                                >
                                    <Eye className="w-3 h-3" />
                                    View Details
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
