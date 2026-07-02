import type { StatPoint } from "@/types/stats";

interface RawWsPoint {
    t: number;
    c: number;
    m: number;
    i: number;
    o: number;
    d: number;
}

type Subscriber = (data: ReadonlyMap<string, StatPoint>) => void;
type StatusSubscriber = (uuid: string, status: "connected" | "disconnected") => void;

class MetricsBuffer {
    private latest = new Map<string, StatPoint>();
    private dirty = false;
    private subscribers = new Set<Subscriber>();
    private statusSubscribers = new Set<StatusSubscriber>();
    private frameId: number | null = null;
    private ivId: ReturnType<typeof setInterval> | null = null;

    push(serverUuid: string, raw: RawWsPoint) {
        const point: StatPoint = {
            timestamp: raw.t,
            cpu: raw.c,
            memory: raw.m,
            netIn: raw.i,
            netOut: raw.o,
            disk: raw.d,
        };
        this.latest.set(serverUuid, point);
        this.dirty = true;
    }

    markStatus(uuid: string, status: "connected" | "disconnected") {
        this.statusSubscribers.forEach((fn) => fn(uuid, status));
    }

    subscribe(cb: Subscriber): () => void {
        this.subscribers.add(cb);
        if (this.subscribers.size === 1) {
            this.startFlushLoop();
        }
        return () => {
            this.subscribers.delete(cb);
            if (this.subscribers.size === 0) {
                this.stopFlushLoop();
            }
        };
    }

    subscribeStatus(cb: StatusSubscriber): () => void {
        this.statusSubscribers.add(cb);
        return () => this.statusSubscribers.delete(cb);
    }

    getSnapshot(): ReadonlyMap<string, StatPoint> {
        return this.latest;
    }

    private flush = () => {
        if (!this.dirty) return;
        this.dirty = false;
        const snapshot = new Map(this.latest);
        this.subscribers.forEach((fn) => fn(snapshot));
    };

    private startFlushLoop() {
        const tick = () => {
            this.flush();
            this.frameId = requestAnimationFrame(tick);
        };
        this.frameId = requestAnimationFrame(tick);
        this.ivId = setInterval(this.flush, 100);
    }

    private stopFlushLoop() {
        if (this.frameId !== null) {
            cancelAnimationFrame(this.frameId);
            this.frameId = null;
        }
        if (this.ivId !== null) {
            clearInterval(this.ivId);
            this.ivId = null;
        }
    }
}

export const globalMetrics = new MetricsBuffer();
