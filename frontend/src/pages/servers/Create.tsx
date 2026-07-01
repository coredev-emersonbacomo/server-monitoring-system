import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    AlertTriangle,
    ArrowLeft,
    ArrowRight,
    CheckCircle2,
    Circle,
    Eye,
    EyeOff,
    Loader2,
    Network,
    ShieldCheck,
    XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useBreadcrumb } from "@/hooks/useBreadcrumb";
import api from "@/api/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
    serverName: string;
    ip: string;
    sshPort: string;
    username: string;
    password: string;
}

type InstallStatus = "pending" | "running" | "done" | "failed";

interface InstallStep {
    id: string;
    label: string;
    description: string;
    status: InstallStatus;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const IP_PATTERN = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;

const INITIAL_STEPS: InstallStep[] = [
    {
        id: "connect",
        label: "Establishing SSH connection",
        description: "Connecting to the remote host via SSH.",
        status: "pending",
    },
    {
        id: "probe",
        label: "Probing system specifications",
        description: "Detecting CPU, memory, and OS details.",
        status: "pending",
    },
    {
        id: "install",
        label: "Installing monitoring agent",
        description: "Downloading and configuring the agent binary.",
        status: "pending",
    },
    {
        id: "register",
        label: "Registering with control plane",
        description: "Agent phoning home and verifying token.",
        status: "pending",
    },
    {
        id: "verify",
        label: "Verifying live metrics",
        description: "Confirming the first heartbeat was received.",
        status: "pending",
    },
];

// Simulated step timing (ms) — replace with real SSE/polling events if available
const STEP_DURATIONS = [1200, 1600, 2000, 1000, 800];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
    label,
    required,
    error,
    hint,
    children,
}: {
    label: string;
    required?: boolean;
    error?: string;
    hint?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium text-foreground/80">
                {label}
                {required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            {children}
            {hint && !error && (
                <p className="text-[11px] text-muted-foreground">{hint}</p>
            )}
            {error && <p className="text-[11px] text-destructive">{error}</p>}
        </div>
    );
}

function StepRow({ step, index }: { step: InstallStep; index: number }) {
    const isRunning = step.status === "running";
    const isDone = step.status === "done";
    const isFailed = step.status === "failed";
    const isPending = step.status === "pending";

    return (
        <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="mt-0.5 shrink-0">
                {isDone && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                )}
                {isFailed && <XCircle className="w-5 h-5 text-destructive" />}
                {isRunning && (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                )}
                {isPending && (
                    <Circle className="w-5 h-5 text-muted-foreground/30" />
                )}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
                <p
                    className={cn(
                        "text-sm font-medium leading-tight",
                        isDone && "text-foreground",
                        isFailed && "text-destructive",
                        isRunning && "text-foreground",
                        isPending && "text-muted-foreground/50",
                    )}
                >
                    {step.label}
                </p>
                <p
                    className={cn(
                        "text-xs mt-0.5",
                        isPending
                            ? "text-muted-foreground/30"
                            : "text-muted-foreground",
                    )}
                >
                    {step.description}
                </p>
            </div>

            {/* Step number for pending */}
            {isPending && (
                <span className="text-[11px] text-muted-foreground/30 font-mono mt-0.5 shrink-0">
                    {String(index + 1).padStart(2, "0")}
                </span>
            )}
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreateServer() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const clientUuid = searchParams.get("client_uuid") || null;
    const { setTrail } = useBreadcrumb();

    const [phase, setPhase] = useState<
        "form" | "installing" | "success" | "failed"
    >("form");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [createdUuid, setCreatedUuid] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string>("");

    const [form, setForm] = useState<FormState>({
        serverName: "",
        ip: "",
        sshPort: "22",
        username: "",
        password: "",
    });

    // Install steps state
    const [steps, setSteps] = useState<InstallStep[]>(INITIAL_STEPS);
    const [currentStep, setCurrentStep] = useState(-1);
    const progressRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        setTrail([
            { label: "Clients", href: "/clients" },
            {
                label: "Add server",
                href: `/servers/create?client_uuid=${clientUuid}`,
            },
        ]);
    }, [setTrail, clientUuid]);

    // ── Simulate step-by-step progress while the real request is in-flight ───
    // When createdId arrives (success) we fast-complete remaining steps.
    // When errorMessage is set we fail the current step.
    const apiResolved = useRef(false);
    const apiSuccess = useRef(false);

    useEffect(() => {
        if (phase !== "installing") return;

        // Start step 0
        setCurrentStep(0);
        setSteps((prev) =>
            prev.map((s, i) => (i === 0 ? { ...s, status: "running" } : s)),
        );
    }, [phase]);

    useEffect(() => {
        if (phase !== "installing" || currentStep < 0) return;
        if (currentStep >= STEP_DURATIONS.length) return;

        const duration = STEP_DURATIONS[currentStep];

        progressRef.current = setTimeout(() => {
            // If API already failed, mark current step failed and stop
            if (apiResolved.current && !apiSuccess.current) {
                setSteps((prev) =>
                    prev.map((s, i) =>
                        i === currentStep ? { ...s, status: "failed" } : s,
                    ),
                );
                setPhase("failed");
                return;
            }

            // Mark current step done
            setSteps((prev) =>
                prev.map((s, i) =>
                    i === currentStep ? { ...s, status: "done" } : s,
                ),
            );

            const next = currentStep + 1;

            if (next >= STEP_DURATIONS.length) {
                // All steps done — wait for API if not yet resolved
                if (apiResolved.current && apiSuccess.current) {
                    setPhase("success");
                } else if (!apiResolved.current) {
                    // Poll until resolved
                    const poll = setInterval(() => {
                        if (apiResolved.current) {
                            clearInterval(poll);
                            if (apiSuccess.current) {
                                setPhase("success");
                            } else {
                                setPhase("failed");
                            }
                        }
                    }, 200);
                }
                return;
            }

            // Move to next step
            setCurrentStep(next);
            setSteps((prev) =>
                prev.map((s, i) =>
                    i === next ? { ...s, status: "running" } : s,
                ),
            );
        }, duration);

        return () => {
            if (progressRef.current) clearTimeout(progressRef.current);
        };
    }, [phase, currentStep]);

    // ── Validation ────────────────────────────────────────────────────────────

    const validate = (): boolean => {
        const errs: Record<string, string> = {};

        if (!form.serverName.trim()) {
            errs.serverName = "Server name is required";
        } else if (form.serverName.trim().length < 2) {
            errs.serverName = "Minimum 2 characters";
        }

        if (!form.ip.trim()) {
            errs.ip = "IP address is required";
        } else if (!IP_PATTERN.test(form.ip.trim())) {
            errs.ip = "Must be a valid IPv4 address";
        } else {
            const parts = form.ip.trim().split(".").map(Number);
            if (parts.some((p) => p < 0 || p > 255)) {
                errs.ip = "One or more octets out of range";
            }
        }

        const port = Number(form.sshPort);
        if (!form.sshPort.trim()) {
            errs.sshPort = "Port is required";
        } else if (isNaN(port) || port < 1 || port > 65535) {
            errs.sshPort = "Must be between 1 and 65535";
        }

        if (!form.username.trim()) errs.username = "Username is required";
        if (!form.password) errs.password = "Password is required";
        else if (form.password.length < 6)
            errs.password = "Minimum 6 characters";

        setErrors(errs);
        return Object.keys(errs).length === 0;
    };

    const set =
        (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
            setForm((f) => ({ ...f, [key]: e.target.value }));
            if (errors[key])
                setErrors((prev) => {
                    const n = { ...prev };
                    delete n[key];
                    return n;
                });
        };

    // ── Submit ────────────────────────────────────────────────────────────────

    const handleSubmit = async () => {
        if (!validate()) return;
        if (!clientUuid) {
            toast.error("No client selected.");
            return;
        }

        apiResolved.current = false;
        apiSuccess.current = false;
        setPhase("installing");
        setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending" })));
        setCurrentStep(-1);

        const { data, error } = await api.POST(
            "/clients/{clientUuid}/servers",
            {
                params: { path: { clientUuid: clientUuid } },
                body: {
                    server_name: form.serverName.trim(),
                    external_ip: form.ip.trim(),
                    ssh_port: Number(form.sshPort),
                    ssh_username: form.username.trim(),
                    ssh_password: form.password,
                },
            },
        );

        if (error) {
            const msg =
                (error as { message?: string }).message ??
                "Connection failed. Check your credentials and try again.";
            setErrorMessage(msg);
            apiResolved.current = true;
            apiSuccess.current = false;
        } else {
            setCreatedUuid(data?.uuid ?? null);
            apiResolved.current = true;
            apiSuccess.current = true;
        }
    };

    // ── Completed steps count for progress bar ────────────────────────────────
    const doneCount = steps.filter((s) => s.status === "done").length;
    const progressPct = Math.round((doneCount / steps.length) * 100);

    // ── No client guard ───────────────────────────────────────────────────────
    if (!clientUuid) {
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
        <div className="w-full flex flex-col min-h-0 bg-background text-foreground">
            {/* ── Body ── */}
            <div className="flex-1 overflow-auto">
                <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8">
                    {/* ════════════════════════════════════════════════════ FORM PHASE */}
                    {phase === "form" && (
                        <>
                            {/* Header */}
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight">
                                    Connect a server
                                </h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    The system will SSH in, install the
                                    monitoring agent, and start collecting
                                    metrics automatically.
                                </p>
                            </div>

                            {/* Form card */}
                            <div className="bg-card border border-border/60 rounded-xl shadow-sm divide-y divide-border/60">
                                {/* Section — Server identity */}
                                <div className="p-6 flex flex-col gap-4">
                                    <div>
                                        <p className="text-sm font-medium">
                                            Server identity
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            A name to identify this server in
                                            the dashboard.
                                        </p>
                                    </div>
                                    <Field
                                        label="Server name"
                                        required
                                        error={errors.serverName}
                                        hint="e.g. prod-web-01"
                                    >
                                        <Input
                                            placeholder="prod-web-01"
                                            value={form.serverName}
                                            onChange={set("serverName")}
                                            className={cn(
                                                errors.serverName &&
                                                    "border-destructive",
                                            )}
                                        />
                                    </Field>
                                </div>

                                {/* Section — Connection */}
                                <div className="p-6 flex flex-col gap-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <p className="text-sm font-medium">
                                                Connection details
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                SSH credentials used once during
                                                agent installation.
                                            </p>
                                        </div>
                                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-2.5 py-0.5 shrink-0">
                                            <ShieldCheck size={11} />
                                            Not stored
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-[1fr_120px] gap-3">
                                        <Field
                                            label="IP address"
                                            required
                                            error={errors.ip}
                                            hint="IPv4 only"
                                        >
                                            <div className="relative">
                                                <Network
                                                    size={13}
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                                                />
                                                <Input
                                                    placeholder="192.168.1.100"
                                                    value={form.ip}
                                                    onChange={set("ip")}
                                                    className={cn(
                                                        "pl-8 font-mono text-sm",
                                                        errors.ip &&
                                                            "border-destructive",
                                                    )}
                                                />
                                            </div>
                                        </Field>

                                        <Field
                                            label="Port"
                                            required
                                            error={errors.sshPort}
                                        >
                                            <Input
                                                placeholder="22"
                                                value={form.sshPort}
                                                onChange={set("sshPort")}
                                                className={cn(
                                                    "font-mono text-sm",
                                                    errors.sshPort &&
                                                        "border-destructive",
                                                )}
                                            />
                                        </Field>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <Field
                                            label="SSH username"
                                            required
                                            error={errors.username}
                                        >
                                            <Input
                                                placeholder="ubuntu"
                                                value={form.username}
                                                onChange={set("username")}
                                                autoComplete="off"
                                                className={cn(
                                                    errors.username &&
                                                        "border-destructive",
                                                )}
                                            />
                                        </Field>

                                        <Field
                                            label="SSH password"
                                            required
                                            error={errors.password}
                                        >
                                            <div className="relative">
                                                <Input
                                                    type={
                                                        showPassword
                                                            ? "text"
                                                            : "password"
                                                    }
                                                    placeholder="••••••••"
                                                    value={form.password}
                                                    onChange={set("password")}
                                                    autoComplete="new-password"
                                                    className={cn(
                                                        "pr-9",
                                                        errors.password &&
                                                            "border-destructive",
                                                    )}
                                                />
                                                <button
                                                    type="button"
                                                    tabIndex={-1}
                                                    onClick={() =>
                                                        setShowPassword(
                                                            (v) => !v,
                                                        )
                                                    }
                                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                                >
                                                    {showPassword ? (
                                                        <EyeOff size={14} />
                                                    ) : (
                                                        <Eye size={14} />
                                                    )}
                                                </button>
                                            </div>
                                        </Field>
                                    </div>
                                </div>

                                {/* Footer actions */}
                                <div className="px-6 py-4 flex items-center justify-between bg-muted/30 rounded-b-xl">
                                    <button
                                        onClick={() => navigate(-1)}
                                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <Button
                                        icon={<ArrowRight size={14} />}
                                        label="Connect and install"
                                        onClick={handleSubmit}
                                    />
                                </div>
                            </div>
                        </>
                    )}

                    {/* ═══════════════════════════════════════════════ INSTALLING PHASE */}
                    {phase === "installing" && (
                        <>
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight">
                                    Installing agent
                                </h1>
                                <p className="text-sm text-muted-foreground mt-1">
                                    This takes about 30 seconds. Don't close
                                    this window.
                                </p>
                            </div>

                            {/* Target server badge */}
                            <div className="flex items-center gap-2 text-sm">
                                <Network
                                    size={13}
                                    className="text-muted-foreground"
                                />
                                <span className="font-mono text-muted-foreground">
                                    {form.username}@{form.ip}:{form.sshPort}
                                </span>
                            </div>

                            {/* Progress bar */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>Progress</span>
                                    <span className="font-mono tabular-nums">
                                        {progressPct}%
                                    </span>
                                </div>
                                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
                                        style={{ width: `${progressPct}%` }}
                                    />
                                </div>
                            </div>

                            {/* Steps list */}
                            <div className="bg-card border border-border/60 rounded-xl p-6 flex flex-col gap-5">
                                {steps.map((step, i) => (
                                    <StepRow
                                        key={step.id}
                                        step={step}
                                        index={i}
                                    />
                                ))}
                            </div>
                        </>
                    )}

                    {/* ═════════════════════════════════════════════════ SUCCESS PHASE */}
                    {phase === "success" && (
                        <div className="flex flex-col items-center text-center gap-6 py-8">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight">
                                    Server online
                                </h1>
                                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                                    <strong className="text-foreground">
                                        {form.serverName}
                                    </strong>{" "}
                                    is connected and sending metrics.
                                </p>
                            </div>

                            {/* Summary */}
                            <div className="w-full bg-card border border-border/60 rounded-xl divide-y divide-border/50 text-sm">
                                {[
                                    {
                                        label: "Server name",
                                        value: form.serverName,
                                    },
                                    {
                                        label: "IP address",
                                        value: `${form.ip}:${form.sshPort}`,
                                    },
                                    { label: "SSH user", value: form.username },
                                    {
                                        label: "Status",
                                        value: "Monitoring active",
                                        accent: true,
                                    },
                                ].map(({ label, value, accent }) => (
                                    <div
                                        key={label}
                                        className="flex items-center justify-between px-5 py-3"
                                    >
                                        <span className="text-muted-foreground">
                                            {label}
                                        </span>
                                        <span
                                            className={cn(
                                                "font-medium",
                                                accent && "text-emerald-500",
                                            )}
                                        >
                                            {value}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    label="Back to client"
                                    onClick={() =>
                                        navigate(`/clients/${clientUuid}`)
                                    }
                                />
                                {createdUuid && (
                                    <Button
                                        label="View server"
                                        icon={<ArrowRight size={14} />}
                                        onClick={() =>
                                            navigate(
                                                `/servers/${createdUuid}`,
                                            )
                                        }
                                    />
                                )}
                            </div>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════ FAILED PHASE */}
                    {phase === "failed" && (
                        <div className="flex flex-col items-center text-center gap-6 py-8">
                            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                                <XCircle className="w-8 h-8 text-destructive" />
                            </div>
                            <div>
                                <h1 className="text-xl font-semibold tracking-tight">
                                    Installation failed
                                </h1>
                                <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                                    {errorMessage ||
                                        "The agent couldn't be installed. Check your credentials and network access."}
                                </p>
                            </div>

                            {/* Failed steps summary */}
                            <div className="w-full bg-card border border-border/60 rounded-xl p-5 flex flex-col gap-4 text-left">
                                {steps.map((step, i) => (
                                    <StepRow
                                        key={step.id}
                                        step={step}
                                        index={i}
                                    />
                                ))}
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    label="Back to client"
                                    onClick={() =>
                                        navigate(`/clients/${clientUuid}`)
                                    }
                                />
                                <Button
                                    label="Try again"
                                    onClick={() => {
                                        setPhase("form");
                                        setErrors({});
                                        setErrorMessage("");
                                        setSteps(
                                            INITIAL_STEPS.map((s) => ({
                                                ...s,
                                                status: "pending",
                                            })),
                                        );
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
