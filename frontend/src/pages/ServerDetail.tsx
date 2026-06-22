import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { useServer } from "@/hooks/useServer";
import { useServerSocket, type WsStatus } from "@/hooks/useServerSocket";
import { ServerCard } from "@/components/dashboard/ServerCard";
import { ChartZoomProvider } from "@/contexts/ChartZoomContext";
import { Button } from "@/components/ui/button";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import type { StatPoint } from "@/types/stats";

export default function ServerDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const serverId = Number(id);

    const { data: initial, isLoading, isError } = useServer(serverId);
    const [, setWsStatus] = useState<WsStatus>("connecting");
    const [liveStats, setLiveStats] = useState<StatPoint[]>([]);

    const handleStats = useCallback((point: StatPoint) => {
        setLiveStats((prev) => {
            const window = 144;
            const next = [...prev, point];
            return next.length > window
                ? next.slice(next.length - window)
                : next;
        });
    }, []);

    useServerSocket(serverId, handleStats, setWsStatus);

    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const { setTrail } = useBreadcrumb();
    useEffect(() => {
        if (initial) {
            setTrail([
                { label: "Clients", href: "/clients" },
                {
                    label: initial.client_name,
                    href: `/clients/${initial.client_id}`,
                },
                { label: initial.server_name, href: `/servers/${initial.id}` },
            ]);
        }
    }, [initial, setTrail]);

    // ── Loading ──────────────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 size={28} className="animate-spin opacity-40" />
                <p className="text-sm">Loading server details…</p>
            </div>
        );
    }

    // ── Error ────────────────────────────────────────────────────────────────
    if (isError || !initial) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <AlertTriangle size={28} className="opacity-40" />
                <p className="text-sm">Server not found.</p>
                <Button
                    variant="outline"
                    size="sm"
                    icon={<ArrowLeft size={14} />}
                    label="Back"
                    onClick={() => navigate("/")}
                />
            </div>
        );
    }

    // ── Merge initial stats with live WS points ──────────────────────────────
    const allStats =
        liveStats.length > 0 ? [...initial.stats, ...liveStats] : initial.stats;

    return (
        <ChartZoomProvider>
            <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
                <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
                    <div>
                        <div className="flex h-16 items-center justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <button
                                    onClick={() => navigate(-1)}
                                    className="p-1.5 -ml-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-muted"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                                        <Loader2 className="w-5 h-5 text-primary" />
                                    </div>
                                    <h1 className="text-lg font-semibold tracking-tight truncate">
                                        {initial.server_name}
                                    </h1>
                                </div>
                            </div>
                            <time className="tabular-nums text-sm text-muted-foreground min-w-20 shrink-0">
                                {time.toLocaleTimeString()}
                            </time>
                        </div>
                    </div>
                </header>

                <main className="py-3 w-full flex-1 min-h-0 overflow-auto">
                    <ServerCard server={{ ...initial, stats: allStats }} />
                </main>
            </div>
        </ChartZoomProvider>
    );
}
