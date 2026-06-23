import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import jwtClient from "@/api/jwtClient";

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

const ipPattern = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

export default function CreateServer() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const clientIdParam = searchParams.get("client_id");
    const clientId = clientIdParam ? Number(clientIdParam) : null;
    const { setTrail } = useBreadcrumb();
    const inputRef = useRef<HTMLInputElement>(null);
    const logEndRef = useRef<HTMLDivElement>(null);

    const [ip, setIp] = useState("");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [phase, setPhase] = useState<"input" | "connecting" | "error">(
        "input",
    );
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
            navigate(`/servers/${createdId}`);
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
    }, [phase, stepIndex, lineIndex, navigate, createdId]);

    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs]);

    const clearError = (field: string) => {
        setErrors((prev) => {
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!ip.trim()) {
            newErrors.ip = "IP address is required";
        } else if (!ipPattern.test(ip.trim())) {
            newErrors.ip = "Invalid IP address format";
        } else {
            const parts = ip.trim().split(".").map(Number);
            if (parts.some((p) => p < 0 || p > 255)) {
                newErrors.ip = "Invalid IP address range";
            }
        }

        if (!username.trim()) {
            newErrors.username = "Username is required";
        }

        if (!password) {
            newErrors.password = "Password is required";
        } else if (password.length < 6) {
            newErrors.password = "Minimum 6 characters";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        if (!clientId) {
            toast.error("No client selected.");
            return;
        }

        setPhase("connecting");
        setLogs([]);
        setStepIndex(0);
        setLineIndex(0);

        const serverName = `server-${ip.trim().replace(/\./g, "-")}`;

        try {
            const response = await jwtClient.post(
                `/clients/${clientId}/servers`,
                {
                    server_name: serverName,
                    internal_ip: ip.trim(),
                    ssh_username: username.trim(),
                    ssh_password: password,
                },
            );

            const server = response.data as { id: number };
            setCreatedId(server.id);
        } catch (err: unknown) {
            const axiosErr = err as {
                response?: { data?: Record<string, unknown> };
            } | undefined;
            const errData = axiosErr?.response?.data;
            if (errData?.errors) {
                const mapped: Record<string, string> = {};
                for (const [k, v] of Object.entries(
                    errData.errors as Record<string, string[]>,
                )) {
                    mapped[k] = Array.isArray(v) ? v[0] : String(v);
                }
                setErrors(mapped);
            } else {
                toast.error(
                    (errData?.message as string) ?? "Failed to create server.",
                );
            }
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

    return (
        <div className="w-full h-full bg-background text-foreground font-mono flex flex-col overflow-hidden">
            {/* Title Bar */}
            <div className="h-8 bg-muted border-b border-border flex items-center justify-between px-3 text-xs select-none">
                <span>Terminal</span>
            </div>

            {/* Terminal */}
            <div className="p-4 h-[calc(100%-32px)] overflow-y-auto text-sm">
                <p className="text-muted-foreground">
                    C:\Users\Admin&gt; server-add --client-id={clientId}
                </p>

                <br />

                {phase === "input" && (
                    <>
                        {/* IP */}
                        <div className="flex items-center flex-wrap">
                            <span className="shrink-0">Enter server IP: </span>
                            <input
                                ref={inputRef}
                                value={ip}
                                onChange={(e) => {
                                    setIp(e.target.value);
                                    if (errors.ip) clearError("ip");
                                }}
                                onFocus={() => clearError("ip")}
                                onKeyDown={handleKeyDown}
                                autoFocus
                                spellCheck={false}
                                className="bg-transparent outline-none border-none text-foreground flex-1 ml-2 min-w-30"
                            />
                        </div>
                        {errors.ip && (
                            <p className="text-red-500 text-xs mt-0.5 ml-35">
                                ERROR: {errors.ip}
                            </p>
                        )}

                        <br />

                        {/* Username */}
                        <div className="flex items-center flex-wrap">
                            <span className="shrink-0">SSH username: </span>
                            <input
                                value={username}
                                onChange={(e) => {
                                    setUsername(e.target.value);
                                    if (errors.username) clearError("username");
                                }}
                                onFocus={() => clearError("username")}
                                onKeyDown={handleKeyDown}
                                spellCheck={false}
                                className="bg-transparent outline-none border-none text-foreground flex-1 ml-2 min-w-30"
                            />
                        </div>
                        {errors.username && (
                            <p className="text-red-500 text-xs mt-0.5 ml-35">
                                ERROR: {errors.username}
                            </p>
                        )}

                        <br />

                        {/* Password */}
                        <div className="flex items-center flex-wrap">
                            <span className="shrink-0">SSH password: </span>
                            <div className="relative flex-1 ml-2 min-w-30 flex items-center">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        if (errors.password)
                                            clearError("password");
                                    }}
                                    onFocus={() => clearError("password")}
                                    onKeyDown={handleKeyDown}
                                    spellCheck={false}
                                    className="bg-transparent outline-none border-none text-foreground w-full pr-5"
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    tabIndex={-1}
                                >
                                    {showPassword ? (
                                        <EyeOff size={14} />
                                    ) : (
                                        <Eye size={14} />
                                    )}
                                </button>
                            </div>
                        </div>
                        {errors.password && (
                            <p className="text-red-500 text-xs mt-0.5 ml-35">
                                ERROR: {errors.password}
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
                        <p>SSH username: {username}</p>
                        <p>SSH password: {"*".repeat(password.length)}</p>
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

                {phase === "error" && (
                    <>
                        <p className="text-destructive">Connection failed.</p>
                        <br />
                        <button
                            onClick={() => {
                                setPhase("input");
                                setErrors({});
                            }}
                            className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        >
                            Press ENTER to retry
                        </button>
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
