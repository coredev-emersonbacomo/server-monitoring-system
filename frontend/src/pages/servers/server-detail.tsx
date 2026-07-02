import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { useServer } from "@/hooks/useServer";
import { useServerSocket, useLiveStats, type WsStatus } from "@/hooks/useServerSocket";
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
    const [history, setHistory] = useState<StatPointData[]>([]);

    useServerSocket(uuid!, setWsStatus);

    const live = useLiveStats(uuid!);

    useEffect(() => {
        if (!live) return;
        setHistory((prev) => {
            const next = [...prev, live as unknown as StatPointData];
            return next.length > 144 ? next.slice(next.length - 144) : next;
        });
    }, [live]);

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

    if (isLoading) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 size={28} className="animate-spin opacity-40" />
                <p className="text-sm">Loading server details…</p>
            </div>
        );
    }

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

    const initialStats = initial?.stats ?? [];
    const allStats =
        history.length > 0 ? [...initialStats, ...history] : initialStats;

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
