import { useEffect, useState } from "react";
import { mockCoops, type Coop, type StatPoint } from "../data/mockDashboard";

let nextTs = Date.now();

function nextPoint(prev: StatPoint): StatPoint {
    const clamp = (v: number, lo: number, hi: number) =>
        Math.max(lo, Math.min(hi, v));
    const rw = (v: number, delta: number) => v + (Math.random() - 0.5) * delta;

    nextTs += 1000;
    return {
        timestamp: nextTs,
        cpu: clamp(rw(prev.cpu, 10), 5, 98),
        memory: clamp(rw(prev.memory, 5), 20, 92),
        netIn: clamp(rw(prev.netIn, 1.5), 0, 30),
        netOut: clamp(rw(prev.netOut, 0.6), 0, 10),
        disk: clamp(rw(prev.disk, 0.4), 30, 99),
    };
}

function trimStats(stats: StatPoint[]): StatPoint[] {
    const window = 144;
    return stats.length > window ? stats.slice(stats.length - window) : stats;
}

export function useMockDashboard() {
    const [coops, setCoops] = useState<Coop[]>(() =>
        structuredClone(mockCoops),
    );

    useEffect(() => {
        const id = setInterval(() => {
            setCoops((prev) =>
                prev.map((coop) => ({
                    ...coop,
                    servers: coop.servers.map((s) => ({
                        ...s,
                        stats: trimStats([
                            ...s.stats,
                            nextPoint(s.stats[s.stats.length - 1]),
                        ]),
                    })),
                })),
            );
        }, 1000);

        return () => clearInterval(id);
    }, []);

    return { coops, status: "connected" as const };
}
