import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";

interface LogLine {
    text: string;
    variant: "info" | "success" | "error" | "input" | "system";
}

const PROGRESS_STEPS: LogLine[][] = [
    [
        { text: "Initializing connection sequence...", variant: "system" },
        {
            text: "C:\\Windows\\system32> ping 192.168.1.100 -n 1",
            variant: "input",
        },
        {
            text: "Reply from 192.168.1.100: bytes=32 time=1ms TTL=64",
            variant: "info",
        },
        {
            text: "Connection established. Handshake initiated.",
            variant: "info",
        },
    ],
    [
        { text: "Authenticating with remote host...", variant: "system" },
        {
            text: "C:\\Windows\\system32> ssh-keyscan 192.168.1.100",
            variant: "input",
        },
        { text: "Host key fingerprint accepted.", variant: "info" },
        { text: "SSH handshake complete. Session opened.", variant: "success" },
    ],
    [
        { text: "Probing hardware specifications...", variant: "system" },
        { text: "C:\\Windows\\system32> wmic cpu get name", variant: "input" },
        { text: "  Intel(R) Xeon(R) Gold 6248R", variant: "info" },
        { text: "  Cores: 24", variant: "info" },
        {
            text: "C:\\Windows\\system32> wmic memory get capacity",
            variant: "input",
        },
        { text: "  34359738368 bytes (32 GB)", variant: "info" },
        {
            text: "C:\\Windows\\system32> wmic os get caption",
            variant: "input",
        },
        { text: "  Ubuntu 24.04.1 LTS", variant: "info" },
    ],
    [
        { text: "Registering server in database...", variant: "system" },
        { text: "Server registered successfully.", variant: "success" },
        { text: "Agent installation token generated.", variant: "info" },
        {
            text: "C:\\Windows\\system32> agent-install --token=abc123 --server=192.168.1.100",
            variant: "input",
        },
        { text: "Waiting for agent to come online...", variant: "system" },
    ],
    [
        { text: "Agent connection established.", variant: "success" },
        { text: "Live metrics feed active.", variant: "success" },
        {
            text: "Setup complete. Server is now being monitored.",
            variant: "success",
        },
    ],
];

export default function CreateServer() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const clientIdParam = searchParams.get("client_id");
    const clientId = clientIdParam ? Number(clientIdParam) : null;
    const { setTrail } = useBreadcrumb();
    const inputRef = useRef<HTMLInputElement>(null);
    const logEndRef = useRef<HTMLDivElement>(null);

    const [ip, setIp] = useState("");
    const [ipError, setIpError] = useState("");
    const [phase, setPhase] = useState<
        "input" | "connecting" | "done" | "error"
    >("input");
    const [logs, setLogs] = useState<LogLine[]>([]);
    const [stepIndex, setStepIndex] = useState(0);
    const [lineIndex, setLineIndex] = useState(0);
    const [createdId, setCreatedId] = useState<number | null>(null);

    useEffect(() => {
        setTrail([
            { label: "Clients", href: "/clients" },
            {
                label: "Add Server",
                href: `/servers/create?client_id=${clientId}`,
            },
        ]);
    }, [setTrail, clientId]);

    useEffect(() => {
        if (phase !== "connecting") return;
        if (stepIndex >= PROGRESS_STEPS.length) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setPhase("done");
            return;
        }

        const step = PROGRESS_STEPS[stepIndex];
        if (lineIndex >= step.length) {
            const delay = stepIndex < PROGRESS_STEPS.length - 1 ? 400 : 200;
            const t = setTimeout(() => {
                setStepIndex((i) => i + 1);
                setLineIndex(0);
            }, delay);
            return () => clearTimeout(t);
        }

        const t = setTimeout(
            () => {
                setLogs((prev) => [...prev, step[lineIndex]]);
                setLineIndex((i) => i + 1);
            },
            300 + Math.random() * 400,
        );

        return () => clearTimeout(t);
    }, [phase, stepIndex, lineIndex]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const handleSubmit = async () => {
        const trimmed = ip.trim();
        const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
        if (!trimmed) {
            setIpError("Required");
            return;
        }
        if (!ipPattern.test(trimmed)) {
            setIpError("Invalid IP address");
            return;
        }
        setIpError("");

        if (!clientId) {
            toast.error("No client selected.");
            return;
        }

        setPhase("connecting");
        setLogs([]);
        setStepIndex(0);
        setLineIndex(0);

        const serverName = `server-${trimmed.replace(/\./g, "-")}`;

        try {
            const res = await fetch(`/api/clients/${clientId}/servers`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
                credentials: "include",
                body: JSON.stringify({
                    internal_ip: trimmed,
                    server_name: serverName,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                toast.error(data?.error ?? "Failed to create server.");
                setPhase("error");
                return;
            }

            const server = await res.json();
            setCreatedId(server.id);
        } catch {
            toast.error("Failed to create server.");
            setPhase("error");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSubmit();
    };

    if (!clientId) {
        return (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 p-8">
                <AlertTriangle size={32} className="opacity-40" />
                <p className="text-sm">No client selected.</p>
                <Button
                    variant="outline"
                    size="sm"
                    icon={<ArrowLeft size={14} />}
                    label="Back to clients"
                    onClick={() => navigate("/clients")}
                />
            </div>
        );
    }

    if (phase === "done") {
        return (
            <div className="flex-1 flex flex-col min-h-0 bg-background text-foreground">
                <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8">
                    <div className="w-full max-w-xl bg-card border border-border/60 rounded-xl shadow-sm overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-muted/50 border-b border-border/60 font-mono text-xs text-muted-foreground select-none">
                            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                            <span className="w-3 h-3 rounded-full bg-yellow-500/80" />
                            <span className="w-3 h-3 rounded-full bg-red-500/80" />
                            <span className="ml-2">
                                Administrator: Command Prompt — Setup Complete
                            </span>
                        </div>
                        <div className="p-5 sm:p-6 font-mono text-sm space-y-2 max-h-96 overflow-y-auto">
                            {logs.map((line, i) => (
                                <p
                                    key={i}
                                    className={lineVariant(line.variant)}
                                >
                                    {line.variant === "input" && (
                                        <span className="text-muted-foreground/50 mr-1">
                                            {">"}
                                        </span>
                                    )}
                                    {line.text}
                                </p>
                            ))}
                            <p className="text-[10px] text-muted-foreground pt-2 border-t border-border/40 mt-3">
                                C:\Users\Admin&gt;{" "}
                                <span className="animate-pulse">_</span>
                            </p>
                        </div>
                        <div className="flex items-center justify-end gap-3 px-5 pb-5">
                            <Button
                                variant="outline"
                                size="sm"
                                label="Back to Client"
                                onClick={() => navigate(`/clients/${clientId}`)}
                            />
                            {createdId && (
                                <Button
                                    size="sm"
                                    label="View Server"
                                    onClick={() =>
                                        navigate(`/servers/${createdId}`)
                                    }
                                />
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full h-full bg-background text-foreground font-mono flex flex-col overflow-hidden">
            {/* Title Bar */}
            <div className="h-8 bg-muted border-b border-border flex items-center justify-between px-3 text-xs select-none">
                <span>Terminal — Add Server</span>
                <div className="flex">
                    <button className="w-10 h-8 hover:bg-muted-foreground/10">
                        ─
                    </button>
                    <button className="w-10 h-8 hover:bg-muted-foreground/10">
                        □
                    </button>
                    <button className="w-10 h-8 hover:bg-destructive hover:text-destructive-foreground">
                        ✕
                    </button>
                </div>
            </div>

            {/* Terminal */}
            <div className="p-4 h-[calc(100%-32px)] overflow-y-auto text-sm">
                <p className="text-muted-foreground">
                    C:\Users\Admin&gt; server-add --client-id={clientId}
                </p>

                <br />

                {phase === "input" && (
                    <>
                        <div className="flex items-center">
                            <span>Enter server IP: </span>
                            <input
                                ref={inputRef}
                                value={ip}
                                onChange={(e) => {
                                    setIp(e.target.value);
                                    setIpError("");
                                }}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                spellCheck={false}
                                className="bg-transparent outline-none border-none text-foreground flex-1 ml-2"
                            />
                            <span className="animate-pulse">█</span>
                        </div>
                        {ipError && (
                            <p className="text-destructive mt-1">
                                ERROR: {ipError}
                            </p>
                        )}
                        <br />
                        <p className="text-muted-foreground">
                            Press ENTER to connect
                        </p>
                    </>
                )}

                {phase === "connecting" && (
                    <>
                        <p>Enter server IP: {ip}</p>
                        <br />
                        {logs.map((line, i) => (
                            <p key={i} className={lineVariant(line.variant)}>
                                {line.text}
                            </p>
                        ))}
                        <p className="text-muted-foreground">
                            <Loader2
                                size={12}
                                className="inline mr-2 animate-spin"
                            />
                            Processing...
                        </p>
                        <div ref={logEndRef} />
                    </>
                )}

                {phase === "done" && (
                    <>
                        <p>Enter server IP: {ip}</p>
                        <br />
                        {logs.map((line, i) => (
                            <p key={i} className={lineVariant(line.variant)}>
                                {line.text}
                            </p>
                        ))}
                        <br />
                        <p className="text-emerald-500">Setup complete.</p>
                        <br />
                        <p>
                            C:\Users\Admin&gt;
                            <span className="animate-pulse">█</span>
                        </p>
                        <br />
                        <div className="space-y-1 text-xs">
                            <p
                                className="cursor-pointer hover:text-foreground"
                                onClick={() => navigate(`/clients/${clientId}`)}
                            >
                                [1] Back to Client
                            </p>
                            {createdId && (
                                <p
                                    className="cursor-pointer hover:text-foreground"
                                    onClick={() =>
                                        navigate(`/servers/${createdId}`)
                                    }
                                >
                                    [2] View Server
                                </p>
                            )}
                        </div>
                    </>
                )}

                {phase === "error" && (
                    <>
                        <p className="text-destructive">Connection failed.</p>
                        <br />
                        <p>
                            C:\Users\Admin&gt;
                            <span className="animate-pulse">█</span>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}

function lineVariant(v: LogLine["variant"]) {
    switch (v) {
        case "success":
            return "text-emerald-500 text-xs";
        case "error":
            return "text-red-500 text-xs";
        case "system":
            return "text-muted-foreground/60 text-[11px]";
        case "input":
            return "text-foreground/80 text-xs";
        default:
            return "text-muted-foreground text-xs";
    }
}
