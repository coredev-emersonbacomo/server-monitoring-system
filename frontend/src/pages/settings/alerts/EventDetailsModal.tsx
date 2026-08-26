import { Radio, X } from "lucide-react";
import type { TelemetryEvent } from "./types";

export function EventDetailsModal({
    event,
    onClose,
}: {
    event: TelemetryEvent;
    onClose: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
                    <div className="flex items-center gap-2 font-mono text-sm">
                        <Radio className="w-4 h-4 text-primary animate-pulse" />
                        <span className="font-semibold text-slate-200">
                            Event Details: [{event.type}]
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 flex flex-col gap-3 overflow-y-auto font-mono text-xs">
                    <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800/60">
                        <span>
                            Timestamp:{" "}
                            {new Date(event.timestamp).toLocaleString()}
                        </span>
                        <span>ID: {event.id}</span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                            Payload Data
                        </span>
                        <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 text-xs overflow-x-auto font-mono leading-relaxed">
                            {JSON.stringify(event.payload, null, 2)}
                        </pre>
                    </div>
                </div>

                <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
