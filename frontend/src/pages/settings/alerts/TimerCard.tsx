import { useEffect, useState } from "react";
import type { TelemetryTask } from "./types";

export function TimerCard({ task, offset }: { task: TelemetryTask; offset: number }) {
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [subStepTimes, setSubStepTimes] = useState<number[]>([]);

    const chainStepsMeta = task.context.chain_steps_meta as
        | Array<{ timing_node_id: string; duration_ms: number }>
        | undefined;
    const isChain = Array.isArray(chainStepsMeta) && chainStepsMeta.length > 1;
    const maxDurationMs = isChain
        ? Math.max(...chainStepsMeta!.map((s) => s.duration_ms))
        : 0;

    useEffect(() => {
        const updateClock = () => {
            const backendTargetMs = task.fire_at * 1000;
            const nowCalculated = Date.now() + offset;
            const diff = Math.max(0, (backendTargetMs - nowCalculated) / 1000);
            setTimeLeft(diff);

            if (isChain && chainStepsMeta) {
                const stepTimes = chainStepsMeta.map((step) => {
                    const stepFireAtMs =
                        backendTargetMs - (maxDurationMs - step.duration_ms);
                    return Math.max(0, (stepFireAtMs - nowCalculated) / 1000);
                });
                setSubStepTimes(stepTimes);
            }
        };

        updateClock();
        const interval = setInterval(updateClock, 100);
        return () => clearInterval(interval);
    }, [task, offset]);

    const stats = task.live_stats;
    const repeatCount = (task.context.repeat_count as number) ?? 0;
    const isRepeat =
        task.context.repeat_fire === true ||
        repeatCount > 0 ||
        task.node_id.includes("repeat");
    const metricType = (task.context.metric_type as string) || "general";

    const displayLabel = task.node_id.startsWith("chain:")
        ? `⛓ ${task.node_id.slice(6).replace(/:/g, " → ")}`
        : task.node_id;

    return (
        <div
            className={`p-2 rounded-lg border flex flex-col gap-1.5 ${
                isRepeat
                    ? "bg-amber-950/30 border-amber-800/50"
                    : "bg-slate-950 border-slate-800"
            }`}
        >
            <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-mono text-slate-300 truncate font-semibold flex-1">
                    {displayLabel}
                </span>
                <span
                    className={`text-xs font-mono font-bold ${
                        timeLeft < 5 ? "text-red-400" : "text-cyan-400"
                    }`}
                >
                    {timeLeft.toFixed(1)}s
                </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
                {isRepeat ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-400 border border-amber-800/60">
                        <svg
                            className="w-2.5 h-2.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2.5}
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                            />
                        </svg>
                        Repeating
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-900/40 text-cyan-400 border border-cyan-800/50">
                        <svg
                            className="w-2.5 h-2.5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <circle cx="12" cy="12" r="4" />
                        </svg>
                        Pending
                    </span>
                )}
                {isChain && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-900/50 text-violet-300 border border-violet-800/60">
                        ⛓ Chain
                    </span>
                )}
                {repeatCount > 0 && (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                        #{repeatCount}
                    </span>
                )}
            </div>

            {isChain && chainStepsMeta && (
                <div className="flex flex-col gap-1 pt-0.5">
                    <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">
                        Chain Steps
                    </span>
                    {chainStepsMeta.map((step, idx) => {
                        const stepSec = subStepTimes[idx] ?? 0;
                        const reached = stepSec <= 0;
                        const stepLabel = step.timing_node_id.replace(/_/g, " ");
                        const stepDurSec = step.duration_ms / 1000;
                        return (
                            <div
                                key={step.timing_node_id}
                                className="flex items-center gap-1.5"
                            >
                                <div className="flex-1 flex items-center gap-1">
                                    <span className="text-[9px] font-mono text-slate-500 shrink-0 w-3 text-right">
                                        {idx + 1}.
                                    </span>
                                    <span className="text-[9px] font-mono text-slate-400 truncate">
                                        {stepLabel}
                                    </span>
                                    <span className="text-[9px] text-slate-600 shrink-0">
                                        ({stepDurSec}s)
                                    </span>
                                </div>
                                {reached ? (
                                    <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-emerald-900/60 text-emerald-400 border border-emerald-800/50 shrink-0">
                                        Reached
                                    </span>
                                ) : (
                                    <span
                                        className={`text-[9px] font-mono font-bold shrink-0 ${
                                            stepSec < 3
                                                ? "text-red-400"
                                                : "text-violet-400"
                                        }`}
                                    >
                                        {stepSec.toFixed(1)}s
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {stats && (
                <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800/80 flex flex-col gap-1 text-[10px] font-mono">
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400">Avg Value:</span>
                        <span className="font-semibold text-slate-200">
                            {stats.avg_value}%{" "}
                            <span className="text-slate-500">
                                (th: {stats.threshold}%)
                            </span>
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-slate-400">Sustain Level:</span>
                        <span
                            className={`font-bold ${
                                stats.sustain_percent >= 100
                                    ? "text-emerald-400"
                                    : "text-amber-400"
                            }`}
                        >
                            {stats.sustain_percent}%{" "}
                            <span className="text-slate-500">
                                ({stats.violating_samples}/{stats.total_samples})
                            </span>
                        </span>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span className="font-mono">{metricType}</span>
                <span>Server #{task.server_id || "global"}</span>
            </div>
        </div>
    );
}
