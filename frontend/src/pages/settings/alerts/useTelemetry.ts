import { useCallback, useEffect, useRef, useState } from "react";
import { getEchoInstance } from "@/hooks/useServerSocket";
import jwtClient from "@/api/jwtClient";
import { NODE_DEFS } from "./nodes";
import type {
    TelemetryTask,
    TelemetryEvent,
    Particle,
    OfflineServer,
} from "./types";

interface TelemetryStats {
    heartbeats: number;
    monitorTicks: number;
    evaluations: number;
    notifications: number;
}

/**
 * Central state + realtime wiring for the System Pipeline & Telemetry
 * Visualizer. Decoupled from rendering so the board, stream, and panels can
 * stay as thin presentational components.
 */
export function useTelemetry(isPaused: boolean) {
    const [tasks, setTasks] = useState<Map<string, TelemetryTask>>(new Map());
    const [events, setEvents] = useState<TelemetryEvent[]>([]);
    const [serverNowOffset, setServerNowOffset] = useState<number>(0);
    const [selectedNode, setSelectedNode] = useState<string | null>(null);
    const [activeEventModal, setActiveEventModal] =
        useState<TelemetryEvent | null>(null);
    // null = waiting for server snapshot; number = server-aligned ms timestamp
    const [lastMonitorSweep, setLastMonitorSweep] = useState<number | null>(null);
    const [monitorIntervalMs, setMonitorIntervalMs] = useState<number>(60000);
    const [monitorCountdown, setMonitorCountdown] = useState<number | null>(null);
    const [stats, setStats] = useState<TelemetryStats>({
        heartbeats: 0,
        monitorTicks: 0,
        evaluations: 0,
        notifications: 0,
    });
    const [offlineServers, setOfflineServers] = useState<OfflineServer[]>([]);

    const particlesRef = useRef<Particle[]>([]);
    const nodeCoordsRef = useRef<Record<string, { x: number; y: number }>>({});

    // Keep node coordinates in sync for particle physics.
    useEffect(() => {
        const coords: Record<string, { x: number; y: number }> = {};
        NODE_DEFS.forEach((n) => {
            coords[n.id] = { x: n.x, y: n.y };
        });
        nodeCoordsRef.current = coords;
    }, []);

    // Real server-anchored countdown — only runs once we have a real sweep.
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

    // Stable callbacks: only setState (stable) + module imports.
    const hydrateFromSnapshot = useCallback((data: Record<string, unknown>) => {
        const backendNow = (data.server_now as number) * 1000;
        const clientNow = Date.now();
        setServerNowOffset(backendNow - clientNow);

        const taskMap = new Map<string, TelemetryTask>();
        ((data.active_tasks as TelemetryTask[]) || []).forEach((t) => {
            taskMap.set(t.task_id, t);
        });
        setTasks(taskMap);

        if (data.last_monitor_sweep_at) {
            const sweepMs = (data.last_monitor_sweep_at as number) * 1000;
            const sweepClientMs = sweepMs - (backendNow - clientNow);
            setLastMonitorSweep(sweepClientMs);
        }
        if (data.monitor_interval_seconds) {
            setMonitorIntervalMs((data.monitor_interval_seconds as number) * 1000);
        }
    }, []);

    const fetchInitialState = useCallback(async () => {
        try {
            const res = await jwtClient.get("/node-configs/telemetry-state");
            hydrateFromSnapshot(res.data);
        } catch (e) {
            console.error("Failed to load telemetry state", e);
        }
    }, [hydrateFromSnapshot]);

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

    useEffect(() => {
        fetchInitialState();
    }, [fetchInitialState]);

    // WebSocket listener for authentic backend events.
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

                if (e.type === "agent_heartbeat") {
                    setStats((s) => ({ ...s, heartbeats: s.heartbeats + 1 }));
                    spawnParticle("agents", "heartbeat_ingress", "#3b82f6");
                    spawnParticle("heartbeat_ingress", "metric_db", "#8b5cf6");
                    spawnParticle("heartbeat_ingress", "rule_engine", "#ec4899");
                } else if (e.type === "system_monitor_sweep") {
                    setStats((s) => ({ ...s, monitorTicks: s.monitorTicks + 1 }));
                    const sweptAtRaw = e.payload.swept_at as number | undefined;
                    if (sweptAtRaw) {
                        setServerNowOffset((offset) => {
                            const sweepClientMs = sweptAtRaw * 1000 - offset;
                            setLastMonitorSweep(sweepClientMs);
                            return offset;
                        });
                    } else {
                        setLastMonitorSweep(Date.now());
                    }
                    spawnParticle("system_monitor", "metric_db", "#f59e0b");
                    const rawServers = e.payload.offline_servers as
                        | OfflineServer[]
                        | undefined;
                    if (rawServers) {
                        setOfflineServers(rawServers);
                    }
                } else if (e.type === "state_snapshot") {
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
                    spawnParticle("scheduler_pool", "rule_engine", "#06b6d4");
                    setTimeout(
                        () =>
                            spawnParticle("rule_engine", "action_outlet", "#ef4444"),
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
                    setStats((s) => ({ ...s, notifications: s.notifications + 1 }));
                    spawnParticle("action_outlet", "agents", "#10b981");
                }
            },
        );

        return () => {
            channel.stopListening(".SystemTelemetryEvent");
        };
    }, [isPaused, hydrateFromSnapshot]);

    const activeTaskList = Array.from(tasks.values());

    return {
        tasks,
        activeTaskList,
        events,
        serverNowOffset,
        selectedNode,
        setSelectedNode,
        activeEventModal,
        setActiveEventModal,
        monitorCountdown,
        stats,
        offlineServers,
        particlesRef,
        nodeCoordsRef,
        fetchInitialState,
    };
}
