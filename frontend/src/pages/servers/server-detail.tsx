import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { useServer } from "@/hooks/useServer";
import { useServerSocket, type WsStatus } from "@/hooks/useServerSocket";
import PageLayout from "@/components/PageLayout";
import { ServerCard } from "@/components/dashboard/ServerCard";
import { ChartZoomProvider } from "@/contexts/ChartZoomContext";
import { Button } from "@/components/ui/button";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import type { StatPointData } from "@/types/models";

export default function ServerDetail() {
    const { uuid } = useParams<{ uuid: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const allClient = searchParams.get("client") === "all";

    const { data: initial, isLoading, isError } = useServer(uuid!);
    const [, setWsStatus] = useState<WsStatus>("connecting");
    const [liveStats, setLiveStats] = useState<StatPointData[]>([]);

    const handleStats = useCallback((point: StatPointData) => {
        setLiveStats((prev) => {
            const window = 144;
            const next = [...prev, point];
            return next.length > window
                ? next.slice(next.length - window)
                : next;
        });
    }, []);

    useServerSocket(uuid!, handleStats, setWsStatus);

    const [time, setTime] = useState(new Date());
    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const { setTrail } = useBreadcrumb();
    useEffect(() => {
        if (!initial) {
            if (allClient) {
                setTrail([{ label: "" }, { label: "" }], true);
            } else {
                setTrail([{ label: "" }, { label: "" }, { label: "" }], true);
            }
            return;
        }

        if (allClient) {
            setTrail(
                [
                    { label: "Servers", href: "/servers" },
                    { label: initial.server_name },
                ],
                false,
            );
        } else {
            setTrail(
                [
                    { label: "Clients", href: "/clients" },
                    {
                        label: initial.client_name,
                        href: `/clients/${initial.client_uuid}`,
                    },
                    { label: initial.server_name },
                ],
                false,
            );
        }
    }, [initial, setTrail, uuid, allClient]);

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
            <PageLayout>
                <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md pb-3 px-5 flex justify-end items-center">
                    <time className="text-sm text-muted-foreground">
                        {time.toLocaleTimeString()}
                    </time>
                </header>

                <main className="py-3 w-full flex-1">
                    <ServerCard server={{ ...initial, stats: allStats }} />
                </main>
            </PageLayout>
        </ChartZoomProvider>
    );
}
