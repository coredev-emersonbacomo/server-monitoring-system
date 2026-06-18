import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Activity } from "lucide-react";
import { useMockDashboard } from "../hooks/useMockDashboard";
import { ServerCard } from "../components/dashboard/ServerCard";
import { ChartZoomProvider } from "../contexts/ChartZoomContext";

export default function ServerDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { clients, status } = useMockDashboard();
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const id = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(id);
    }, []);

    const serverId = Number(id);

    let foundServer: (typeof clients)[number]["servers"][number] | null = null;
    let foundClient: (typeof clients)[number] | null = null;
    for (const c of clients) {
        const s = c.servers.find((sv) => sv.id === serverId);
        if (s) {
            foundServer = s;
            foundClient = c;
            break;
        }
    }

    if (!foundServer || !foundClient) {
        return (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
                Server not found
            </div>
        );
    }

    return (
        <ChartZoomProvider>
            <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
                <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-md">
                    <div className="px-4 sm:px-6 lg:px-8">
                        <div className="flex h-16 items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => navigate("/")}
                                    className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                                >
                                    <ArrowLeft className="w-5 h-5" />
                                </button>
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Activity className="w-5 h-5 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-lg font-semibold tracking-tight">
                                        {foundServer.name}
                                    </h1>
                                    <p className="text-xs text-muted-foreground">
                                        {foundClient.name} &middot; {foundClient.region} &middot; {foundServer.ip}
                                    </p>
                                </div>
                                {status === "connected" && (
                                    <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse ml-2" title="Live" />
                                )}
                            </div>
                            <time className="tabular-nums text-sm text-muted-foreground min-w-20">
                                {time.toLocaleTimeString()}
                            </time>
                        </div>
                    </div>
                </header>

                <main className="px-4 sm:px-6 lg:px-8 py-6 w-full flex-1 min-h-0 overflow-auto">
                    <ServerCard server={foundServer} />
                </main>
            </div>
        </ChartZoomProvider>
    );
}
