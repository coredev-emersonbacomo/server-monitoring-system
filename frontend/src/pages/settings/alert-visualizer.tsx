import { useEffect, useRef, useState, useMemo } from "react";
import PageLayout from "@/components/PageLayout";
import IndexHeader from "@/components/IndexHeader";
import { getEchoInstance } from "@/hooks/useServerSocket";
import jwtClient from "@/api/jwtClient";
import {
    Activity,
    Server,
    Cpu,
    Database,
    Clock,
    Send,
    RefreshCw,
    Play,
    Pause,
    CheckCircle2,
    Radio,
    Eye,
    X,
} from "lucide-react";

interface TelemetryTask {
    task_id: string;
    config_id: number;
    node_id: string;
    server_id: number | null;
    fire_at: number; // microtime float
    delay_ms: number;
    created_at: number;
    context: Record<string, unknown>;
    live_stats?: {
        avg_value: number;
        total_samples: number;
        violating_samples: number;
        sustain_percent: number;
        threshold: number;
        operator: string;
    };
}

interface TelemetryEvent {
    id: string;
    type: string;
    timestamp: number;
    payload: Record<string, unknown>;
}

interface Particle {
    id: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    progress: number; // 0 to 1
    color: string;
    speed: number;
}

export function AlertVisualizer() {
    const [tasks, setTasks] = useState<Map<string, TelemetryTask>>(new Map());
    const [events, setEvents] = useState<TelemetryEvent[]>([]);
    const [serverNowOffset, setServerNowOffset] = useState<number>(0);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [isPaused, setIsPaused] = useState(false);
    const [activeEventModal, setActiveEventModal] =
        useState<TelemetryEvent | null>(null);
    // null = unknown (waiting for server snapshot); number = server-aligned ms timestamp of last sweep
    const [lastMonitorSweep, setLastMonitorSweep] = useState<number | null>(
        null,
    );
    const [monitorIntervalMs, setMonitorIntervalMs] = useState<number>(60000);
    const [monitorCountdown, setMonitorCountdown] = useState<number | null>(
        null,
    );
    const [stats, setStats] = useState({
        heartbeats: 0,
        monitorTicks: 0,
        evaluations: 0,
        notifications: 0,
    });
    const [offlineServers, setOfflineServers] = useState<
        {
            uuid: string;
            name: string;
            client_name: string;
            went_offline_at: string | null;
        }[]
    >([]);

    // Real server-anchored countdown — only runs once we have a real sweep timestamp
    useEffect(() => {
        if (lastMonitorSweep === null) return;
        const interval = setInterval(() => {
            const elapsedMs = Date.now() - lastMonitorSweep;
            const remainingSec = Math.max(
                0,
                (monitorIntervalMs - (elapsedMs % monitorIntervalMs)) / 1000,
            );
            setMonitorCountdown(remainingSec);
        }, 100);
        return () => clearInterval(interval);
    }, [lastMonitorSweep, monitorIntervalMs]);

    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const nodeCoordsRef = useRef<Record<string, { x: number; y: number }>>({});

    // Node Positions on Visualizer Board
    const nodeDefs = useMemo(() => {
        return [
            {
                id: "agents",
                label: "Agent Pool",
                icon: Server,
                x: 100,
                y: 120,
                color: "#3b82f6",
                type: "ingress",
            },
            {
                id: "heartbeat_ingress",
                label: "Heartbeat Gateway",
                icon: Activity,
                x: 320,
                y: 120,
                color: "#10b981",
                type: "processor",
            },
            {
                id: "system_monitor",
                label: "System Monitor",
                icon: Clock,
                x: 100,
                y: 320,
                color: "#f59e0b",
                type: "cron",
            },
            {
                id: "metric_db",
                label: "Metric DB Storage",
                icon: Database,
                x: 550,
                y: 320,
                color: "#8b5cf6",
                type: "storage",
            },
            {
                id: "rule_engine",
                label: "Node Config FSM",
                icon: Cpu,
                x: 550,
                y: 120,
                color: "#ec4899",
                type: "fsm",
            },
            {
                id: "scheduler_pool",
                label: "Task Scheduler Pool",
                icon: RefreshCw,
                x: 800,
                y: 120,
                color: "#06b6d4",
                type: "timer",
            },
            {
                id: "action_outlet",
                label: "Notification Channels",
                icon: Send,
                x: 800,
                y: 320,
                color: "#ef4444",
                type: "outlet",
            },
        ];
    }, []);

    // Sync node coordinates for particle physics
    useEffect(() => {
        const coords: Record<string, { x: number; y: number }> = {};
        nodeDefs.forEach((n) => {
            coords[n.id] = { x: n.x, y: n.y };
        });
        nodeCoordsRef.current = coords;
    }, [nodeDefs]);

    // Hydrate all state from a backend snapshot object (REST or WS state_snapshot event)
    const hydrateFromSnapshot = (data: Record<string, unknown>) => {
        const backendNow = (data.server_now as number) * 1000;
        const clientNow = Date.now();
        setServerNowOffset(backendNow - clientNow);

        const taskMap = new Map<string, TelemetryTask>();
        ((data.active_tasks as TelemetryTask[]) || []).forEach((t) => {
            taskMap.set(t.task_id, t);
        });
        setTasks(taskMap);

        // Anchor the system monitor countdown to the real server-reported last sweep time.
        // last_monitor_sweep_at is a PHP microtime float (seconds.microseconds).
        if (data.last_monitor_sweep_at) {
            const sweepMs = (data.last_monitor_sweep_at as number) * 1000;
            // Convert to local client time using the server offset we just computed
            const sweepClientMs = sweepMs - (backendNow - clientNow);
            setLastMonitorSweep(sweepClientMs);
        }
        if (data.monitor_interval_seconds) {
            setMonitorIntervalMs(
                (data.monitor_interval_seconds as number) * 1000,
            );
        }
    };

    // Initial state fetch from backend (authentic tasks & server clock offset)
    const fetchInitialState = async () => {
        try {
            const res = await jwtClient.get("/node-configs/telemetry-state");
            hydrateFromSnapshot(res.data);
        } catch (e) {
            console.error("Failed to load telemetry state", e);
        }
    };

    const fetchOfflineServers = async () => {
        try {
            const res = await jwtClient.get("/v1/servers");
            const servers: {
                uuid: string;
                name: string;
                client_name: string;
                status: string | null;
                went_offline_at: string | null;
            }[] = res.data.data ?? res.data ?? [];
            setOfflineServers(
                servers
                    .filter((s) => s.status === "offline")
                    .map(({ uuid, name, client_name, went_offline_at }) => ({
                        uuid,
                        name,
                        client_name,
                        went_offline_at,
                    })),
            );
        } catch {
            // silently ignore
        }
    };

    useEffect(() => {
        fetchInitialState();
        fetchOfflineServers();
    }, []);

    // Trigger particle motion along edges
    const spawnParticle = (
        fromId: string,
        toId: string,
        color: string = "#10b981",
    ) => {
        const from = nodeCoordsRef.current[fromId];
        const to = nodeCoordsRef.current[toId];
        if (!from || !to) return;

        particlesRef.current.push({
            id: Math.random().toString(36).substring(2, 9),
            startX: from.x,
            startY: from.y,
            endX: to.x,
            endY: to.y,
            progress: 0,
            color,
            speed: 0.02 + Math.random() * 0.015,
        });
    };

    // WebSocket listener for authentic backend events
    useEffect(() => {
        const echo = getEchoInstance();
        if (!echo) return;

        const channel = echo.private("system-telemetry");

        channel.listen(
            ".SystemTelemetryEvent",
            (e: { type: string; payload: Record<string, unknown> }) => {
                if (isPaused) return;

                const newEvt: TelemetryEvent = {
                    id: Math.random().toString(36).substring(2, 9),
                    type: e.type,
                    timestamp: Date.now(),
                    payload: e.payload,
                };

                setEvents((prev) => [newEvt, ...prev.slice(0, 30)]);

                // Particle Animations & Counter Stats according to exact backend event
                if (e.type === "agent_heartbeat") {
                    setStats((s) => ({ ...s, heartbeats: s.heartbeats + 1 }));
                    spawnParticle("agents", "heartbeat_ingress", "#3b82f6");
                    spawnParticle("heartbeat_ingress", "metric_db", "#8b5cf6");
                    spawnParticle(
                        "heartbeat_ingress",
                        "rule_engine",
                        "#ec4899",
                    );
                } else if (e.type === "system_monitor_sweep") {
                    setStats((s) => ({
                        ...s,
                        monitorTicks: s.monitorTicks + 1,
                    }));
                    // Use swept_at from payload if available (real server microtime),
                    // otherwise fall back to local clock
                    const sweptAtRaw = e.payload.swept_at as number | undefined;
                    if (sweptAtRaw) {
                        // Convert server microtime → client-local ms using stored offset
                        setServerNowOffset((offset) => {
                            const sweepClientMs = sweptAtRaw * 1000 - offset;
                            setLastMonitorSweep(sweepClientMs);
                            return offset;
                        });
                    } else {
                        setLastMonitorSweep(Date.now());
                    }
                    spawnParticle("system_monitor", "metric_db", "#f59e0b");
                } else if (e.type === "state_snapshot") {
                    // Backend pushed a full snapshot (e.g. on client (re)connect)
                    hydrateFromSnapshot(e.payload as Record<string, unknown>);
                } else if (e.type === "task_scheduled") {
                    const task = e.payload as unknown as TelemetryTask;
                    setTasks((prev) => {
                        const next = new Map(prev);
                        next.set(task.task_id, task);
                        return next;
                    });
                    spawnParticle("rule_engine", "scheduler_pool", "#06b6d4");
                } else if (e.type === "task_fired") {
                    const taskId = e.payload.task_id as string;
                    setTasks((prev) => {
                        const next = new Map(prev);
                        next.delete(taskId);
                        return next;
                    });
                    // Timer fires -> re-evaluates rule_engine -> fires notification channel
                    spawnParticle("scheduler_pool", "rule_engine", "#06b6d4");
                    setTimeout(
                        () =>
                            spawnParticle(
                                "rule_engine",
                                "action_outlet",
                                "#ef4444",
                            ),
                        200,
                    );
                } else if (e.type === "task_cancelled") {
                    const taskId = e.payload.task_id as string;
                    setTasks((prev) => {
                        const next = new Map(prev);
                        next.delete(taskId);
                        return next;
                    });
                } else if (e.type === "notification_dispatched") {
                    setStats((s) => ({
                        ...s,
                        notifications: s.notifications + 1,
                    }));
                    spawnParticle("action_outlet", "agents", "#10b981");
                }
            },
        );

        return () => {
            channel.stopListening(".SystemTelemetryEvent");
        };
    }, [isPaused]);

    // Canvas particle loop animation
    useEffect(() => {
        let animId: number;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw connection lines
            const connections = [
                ["agents", "heartbeat_ingress"],
                ["heartbeat_ingress", "metric_db"],
                ["heartbeat_ingress", "rule_engine"],
                ["system_monitor", "metric_db"],
                ["rule_engine", "scheduler_pool"],
                ["scheduler_pool", "rule_engine"],
                ["rule_engine", "action_outlet"],
                ["scheduler_pool", "action_outlet"],
            ];

            ctx.lineWidth = 2;
            ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";

            connections.forEach(([fromId, toId]) => {
                const from = nodeCoordsRef.current[fromId];
                const to = nodeCoordsRef.current[toId];
                if (from && to) {
                    ctx.beginPath();
                    ctx.moveTo(from.x, from.y);
                    ctx.lineTo(to.x, to.y);
                    ctx.stroke();
                }
            });

            // Update & draw glowing particle physics
            particlesRef.current = particlesRef.current.filter((p) => {
                p.progress += p.speed;
                if (p.progress >= 1) return false;

                const currX = p.startX + (p.endX - p.startX) * p.progress;
                const currY = p.startY + (p.endY - p.startY) * p.progress;

                // Particle Outer Glow
                ctx.beginPath();
                ctx.arc(currX, currY, 6, 0, Math.PI * 2);
                ctx.fillStyle = p.color + "44";
                ctx.fill();

                // Particle Core
                ctx.beginPath();
                ctx.arc(currX, currY, 3, 0, Math.PI * 2);
                ctx.fillStyle = p.color;
                ctx.fill();

                return true;
            });

            animId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animId);
        };
    }, []);

    // Timer Countdown calculation (Server-synced)
    const activeTaskList = Array.from(tasks.values());

    return (
        <PageLayout>
            <IndexHeader
                icon={Activity}
                title="System Pipeline & Telemetry Visualizer"
                description="Live real-time game-map ecosystem showing agent heartbeats, system monitor sweeps, particle streams, and authentic backend timer countdowns."
                trail={[
                    { label: "Settings", href: "/settings" },
                    { label: "Visualizer" },
                ]}
            />

            <main className="py-6 w-full flex-1 flex flex-col gap-6 px-6">
                {/* Top Control Bar & Stats */}
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
                                    {activeTaskList.length}
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
                            onClick={() => setIsPaused(!isPaused)}
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
                            onClick={fetchInitialState}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Sync State
                        </button>
                    </div>
                </div>

                {/* Main Visualizer Board Container */}
                <div className="relative w-full h-120 bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                    {/* Layer 1: Animated Particle Canvas Overlay */}
                    <canvas
                        ref={canvasRef}
                        width={1000}
                        height={480}
                        className="absolute inset-0 w-full h-full pointer-events-none z-10"
                    />

                    {/* Layer 2: Interactive SVG & HTML Node Buildings */}
                    {nodeDefs.map((node) => {
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
                                        style={{
                                            backgroundColor: `${node.color}22`,
                                        }}
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

                    {/* Task Scheduler Active Timer Badges Floating on Board */}
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
                                <span className="text-xs">
                                    No pending timers
                                </span>
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

                {/* Bottom Event Log Stream */}
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
                                            {new Date(
                                                e.timestamp,
                                            ).toLocaleTimeString()}
                                        </span>
                                        <span className="font-semibold text-primary">
                                            [{e.type}]
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() =>
                                                setActiveEventModal(e)
                                            }
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

                {/* Offline Servers */}
                <div className="bg-card border border-border/60 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                            <Server className="w-4 h-4 text-red-400" />
                            Offline Servers
                        </h3>
                        <button
                            onClick={fetchOfflineServers}
                            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium bg-secondary hover:bg-secondary/80 rounded-lg transition-colors"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Refresh
                        </button>
                    </div>

                    <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
                        {offlineServers.length === 0 ? (
                            <p className="text-muted-foreground text-center py-4 text-xs">
                                No offline servers
                            </p>
                        ) : (
                            offlineServers.map((s) => (
                                <div
                                    key={s.uuid}
                                    className="flex items-center justify-between p-2 rounded-lg bg-muted/40 border border-border/40"
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                        <span className="font-medium text-xs truncate">
                                            {s.name}
                                        </span>
                                        <span className="text-[11px] text-muted-foreground truncate">
                                            {s.client_name}
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-mono text-muted-foreground shrink-0">
                                        {s.went_offline_at
                                            ? (() => {
                                                  const d = new Date(
                                                      s.went_offline_at,
                                                  );
                                                  const ago = Math.round(
                                                      (Date.now() - d.getTime()) /
                                                          60000,
                                                  );
                                                  return ago < 1
                                                      ? "<1m ago"
                                                      : ago < 60
                                                        ? `${ago}m ago`
                                                        : `${Math.floor(ago / 60)}h ${ago % 60}m ago`;
                                              })()
                                            : "unknown"}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Formatted Event Details Modal */}
                {activeEventModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
                        <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
                                <div className="flex items-center gap-2 font-mono text-sm">
                                    <Radio className="w-4 h-4 text-primary animate-pulse" />
                                    <span className="font-semibold text-slate-200">
                                        Event Details: [{activeEventModal.type}]
                                    </span>
                                </div>
                                <button
                                    onClick={() => setActiveEventModal(null)}
                                    className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-4 flex flex-col gap-3 overflow-y-auto font-mono text-xs">
                                <div className="flex items-center justify-between text-slate-400 pb-2 border-b border-slate-800/60">
                                    <span>
                                        Timestamp:{" "}
                                        {new Date(
                                            activeEventModal.timestamp,
                                        ).toLocaleString()}
                                    </span>
                                    <span>ID: {activeEventModal.id}</span>
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                                        Payload Data
                                    </span>
                                    <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 text-xs overflow-x-auto font-mono leading-relaxed">
                                        {JSON.stringify(
                                            activeEventModal.payload,
                                            null,
                                            2,
                                        )}
                                    </pre>
                                </div>
                            </div>

                            <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex justify-end">
                                <button
                                    onClick={() => setActiveEventModal(null)}
                                    className="px-4 py-1.5 text-xs font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </PageLayout>
    );
}

// Sub-component for exact backend-synced countdown clock
function TimerCard({ task, offset }: { task: TelemetryTask; offset: number }) {
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [subStepTimes, setSubStepTimes] = useState<number[]>([]);

    const chainStepsMeta = (task.context.chain_steps_meta as Array<{ timing_node_id: string; duration_ms: number }> | undefined);
    const isChain = Array.isArray(chainStepsMeta) && chainStepsMeta.length > 1;
    const maxDurationMs = isChain ? Math.max(...chainStepsMeta!.map(s => s.duration_ms)) : 0;

    useEffect(() => {
        const updateClock = () => {
            const backendTargetMs = task.fire_at * 1000;
            const nowCalculated = Date.now() + offset;
            const diff = Math.max(0, (backendTargetMs - nowCalculated) / 1000);
            setTimeLeft(diff);

            if (isChain && chainStepsMeta) {
                const stepTimes = chainStepsMeta.map(step => {
                    // Virtual fire time for sub-step = fire_at - (max_duration - step_duration) / 1000
                    const stepFireAtMs = backendTargetMs - (maxDurationMs - step.duration_ms);
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
    const isRepeat = task.context.repeat_fire === true || repeatCount > 0 || task.node_id.includes("repeat");
    const metricType = (task.context.metric_type as string) || "general";

    // Human-readable label: strip "chain:" prefix for display
    const displayLabel = task.node_id.startsWith("chain:")
        ? `⛓ ${task.node_id.slice(6).replace(/:/g, " → ")}`
        : task.node_id;

    return (
        <div className={`p-2 rounded-lg border flex flex-col gap-1.5 ${isRepeat ? "bg-amber-950/30 border-amber-800/50" : "bg-slate-950 border-slate-800"}`}>
            {/* Header row: node_id + countdown */}
            <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-mono text-slate-300 truncate font-semibold flex-1">
                    {displayLabel}
                </span>
                <span className={`text-xs font-mono font-bold ${timeLeft < 5 ? "text-red-400" : "text-cyan-400"}`}>
                    {timeLeft.toFixed(1)}s
                </span>
            </div>

            {/* Status badge row */}
            <div className="flex items-center gap-1.5 flex-wrap">
                {isRepeat ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-400 border border-amber-800/60">
                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                        </svg>
                        Repeating
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-cyan-900/40 text-cyan-400 border border-cyan-800/50">
                        <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24">
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

            {/* Chain sub-step parallel countdowns */}
            {isChain && chainStepsMeta && (
                <div className="flex flex-col gap-1 pt-0.5">
                    <span className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Chain Steps</span>
                    {chainStepsMeta.map((step, idx) => {
                        const stepSec = subStepTimes[idx] ?? 0;
                        const reached = stepSec <= 0;
                        const stepLabel = step.timing_node_id.replace(/_/g, " ");
                        const stepDurSec = step.duration_ms / 1000;
                        return (
                            <div key={step.timing_node_id} className="flex items-center gap-1.5">
                                <div className="flex-1 flex items-center gap-1">
                                    <span className="text-[9px] font-mono text-slate-500 shrink-0 w-3 text-right">{idx + 1}.</span>
                                    <span className="text-[9px] font-mono text-slate-400 truncate">{stepLabel}</span>
                                    <span className="text-[9px] text-slate-600 shrink-0">({stepDurSec}s)</span>
                                </div>
                                {reached ? (
                                    <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-emerald-900/60 text-emerald-400 border border-emerald-800/50 shrink-0">
                                        Reached
                                    </span>
                                ) : (
                                    <span className={`text-[9px] font-mono font-bold shrink-0 ${stepSec < 3 ? "text-red-400" : "text-violet-400"}`}>
                                        {stepSec.toFixed(1)}s
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Live stats */}
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
                            className={`font-bold ${stats.sustain_percent >= 100 ? "text-emerald-400" : "text-amber-400"}`}
                        >
                            {stats.sustain_percent}%{" "}
                            <span className="text-slate-500">
                                ({stats.violating_samples}/{stats.total_samples}
                                )
                            </span>
                        </span>
                    </div>
                </div>
            )}

            {/* Footer row: metric type + server */}
            <div className="flex items-center justify-between text-[10px] text-slate-500">
                <span className="font-mono">{metricType}</span>
                <span>Server #{task.server_id || "global"}</span>
            </div>
        </div>
    );
}

export default AlertVisualizer;
