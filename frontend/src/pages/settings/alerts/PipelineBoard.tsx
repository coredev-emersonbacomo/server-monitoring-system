import { Clock, CheckCircle2 } from "lucide-react";
import { ParticleCanvas } from "./ParticleCanvas";
import { TimerCard } from "./TimerCard";
import { NODE_DEFS } from "./nodes";
import type { TelemetryTask, Particle } from "./types";

interface PipelineBoardProps {
    particlesRef: React.MutableRefObject<Particle[]>;
    nodeCoordsRef: React.MutableRefObject<
        Record<string, { x: number; y: number }>
    >;
    selectedNode: string | null;
    setSelectedNode: (id: string) => void;
    activeTaskList: TelemetryTask[];
    serverNowOffset: number;
    monitorCountdown: number | null;
}

export function PipelineBoard({
    particlesRef,
    nodeCoordsRef,
    selectedNode,
    setSelectedNode,
    activeTaskList,
    serverNowOffset,
    monitorCountdown,
}: PipelineBoardProps) {
    return (
        <div className="relative w-full h-120 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <ParticleCanvas
                particlesRef={particlesRef}
                nodeCoordsRef={nodeCoordsRef}
            />

            {NODE_DEFS.map((node) => {
                const Icon = node.icon;
                const isSelected = selectedNode === node.id;

                return (
                    <div
                        key={node.id}
                        onClick={() => setSelectedNode(node.id)}
                        style={{
                            left: `${node.x - 70}px`,
                            top: `${node.y - 45}px`,
                        }}
                        className={`absolute w-36 h-24 p-3 rounded-xl border z-20 cursor-pointer transition-all duration-200 flex flex-col justify-between ${
                            isSelected
                                ? "border-primary bg-slate-900 shadow-lg shadow-primary/20 scale-105"
                                : "border-slate-800 bg-slate-900/80 hover:border-slate-700 hover:bg-slate-900"
                        }`}
                    >
                        <div className="flex items-center justify-between">
                            <div
                                className="p-1.5 rounded-lg"
                                style={{ backgroundColor: `${node.color}22` }}
                            >
                                <Icon
                                    className="w-4 h-4"
                                    style={{ color: node.color }}
                                />
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                                {node.type}
                            </span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-200 truncate">
                                {node.label}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">
                                {node.id === "scheduler_pool"
                                    ? `${activeTaskList.length} active`
                                    : node.id === "system_monitor"
                                      ? monitorCountdown === null
                                          ? "Syncing..."
                                          : `Next: ${monitorCountdown.toFixed(1)}s`
                                      : "Online"}
                            </p>
                        </div>
                    </div>
                );
            })}

            <div className="absolute right-6 top-6 bottom-6 w-64 bg-slate-900/90 border border-slate-800 rounded-xl p-3 z-30 flex flex-col gap-2 overflow-y-auto">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        Active Backend Timers
                    </span>
                    <span className="text-[10px] font-mono bg-cyan-950 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-800/50">
                        Real
                    </span>
                </div>

                {activeTaskList.length === 0 ? (
                    <div className="flex flex-col items-center justify-center flex-1 text-slate-600 gap-1">
                        <CheckCircle2 className="w-6 h-6 opacity-40" />
                        <span className="text-xs">No pending timers</span>
                    </div>
                ) : (
                    activeTaskList.map((t) => (
                        <TimerCard
                            key={t.task_id}
                            task={t}
                            offset={serverNowOffset}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
