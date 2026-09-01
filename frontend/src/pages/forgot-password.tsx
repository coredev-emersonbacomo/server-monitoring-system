import { useState, useEffect, useCallback, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, ChevronLeft, Eye, EyeOff, Mail, Lock, Key } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { FloatingInput } from "@/components/ui/floatingInput";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import axios from "axios";

type Step = 1 | 2 | 3;

export default function ForgotPassword() {
    useDocumentTitle("Forgot Password");
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>(1);
    const [email, setEmail] = useState("");
    const [maskedEmail, setMaskedEmail] = useState("");
    const [code, setCode] = useState("");
    const [resetToken, setResetToken] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    const [errors, setErrors] = useState<Record<string, string[]>>({});
    const [isPending, setIsPending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(() => {
        const stored = localStorage.getItem("reset_password_cooldown");
        if (stored) {
            const expiry = parseInt(stored, 10);
            const remaining = Math.ceil((expiry - Date.now()) / 1000);
            return remaining > 0 ? remaining : 0;
        }
        return 0;
    });

    useEffect(() => {
        if (resendCooldown <= 0) {
            localStorage.removeItem("reset_password_cooldown");
            return;
        }
        const timer = setInterval(() => {
            setResendCooldown((prev) => {
                if (prev <= 1) {
                    localStorage.removeItem("reset_password_cooldown");
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const setCooldown = (seconds: number) => {
        setResendCooldown(seconds);
        localStorage.setItem("reset_password_cooldown", (Date.now() + seconds * 1000).toString());
    };

    const handleSendCode = useCallback(async (e: SubmitEvent) => {
        e.preventDefault();
        setErrors({});
        setIsPending(true);
        try {
            const { data } = await axios.post("/api/v1/forgot-password", { email });
            setMaskedEmail(data.masked_email);
            setStep(2);
            setCooldown(60);
            toast.success("A reset code has been sent to your email.");
        } catch (err: unknown) {
            if (err && typeof err === "object" && "response" in err) {
                const axiosErr = err as { response?: { status?: number; data?: Record<string, unknown> } };
                if (axiosErr.response?.data) {
                    const data = axiosErr.response.data;
                    if (axiosErr.response.status === 429) {
                        const secondsLeft = (data.seconds_remaining as number) || 60;
                        setCooldown(secondsLeft);
                        if (data.masked_email) {
                            setMaskedEmail(data.masked_email as string);
                        }
                        setStep(2);
                        setErrors({ code: [(data.message as string) || `Please wait ${secondsLeft} seconds before requesting a new code.`] });
                    } else if ("errors" in data) {
                        setErrors(data.errors as Record<string, string[]>);
                    } else if ("message" in data) {
                        setErrors({ email: [data.message as string] });
                    }
                }
            }
        } finally {
            setIsPending(false);
        }
    }, [email]);

    const handleResendCode = useCallback(async () => {
        if (resendCooldown > 0) return;
        setErrors({});
        setIsPending(true);
        try {
            await axios.post("/api/v1/forgot-password", { email });
            setCooldown(60);
            toast.success("A new verification code has been sent to your email.");
        } catch (err: unknown) {
            if (err && typeof err === "object" && "response" in err) {
                const axiosErr = err as { response?: { status?: number; data?: Record<string, unknown> } };
                if (axiosErr.response?.data) {
                    const data = axiosErr.response.data;
                    if (axiosErr.response.status === 429) {
                        const secondsLeft = (data.seconds_remaining as number) || 60;
                        setCooldown(secondsLeft);
                        setErrors({ code: [(data.message as string) || `Please wait ${secondsLeft} seconds before requesting a new code.`] });
                    }
                }
            }
        } finally {
            setIsPending(false);
        }
    }, [email, resendCooldown]);

    const handleVerifyCode = useCallback(async (e: SubmitEvent) => {
        e.preventDefault();
        setErrors({});
        setIsPending(true);
        try {
            const { data } = await axios.post("/api/v1/verify-reset-code", { email, code });
            setResetToken(data.reset_token);
            setStep(3);
        } catch (err: unknown) {
            if (err && typeof err === "object" && "response" in err) {
                const axiosErr = err as { response?: { data?: Record<string, unknown> } };
                if (axiosErr.response?.data) {
                    const data = axiosErr.response.data;
                    if ("errors" in data) {
                        setErrors(data.errors as Record<string, string[]>);
                    } else if ("message" in data) {
                        setErrors({ code: [data.message as string] });
                    }
                }
            }
        } finally {
            setIsPending(false);
        }
    }, [email, code]);

    const handleResetPassword = useCallback(async (e: SubmitEvent) => {
        e.preventDefault();
        setErrors({});
        setIsPending(true);
        try {
            await axios.post("/api/v1/reset-password", {
                reset_token: resetToken,
                password,
                password_confirmation: passwordConfirmation,
            });
            navigate("/login", { replace: true });
        } catch (err: unknown) {
            if (err && typeof err === "object" && "response" in err) {
                const axiosErr = err as { response?: { data?: Record<string, unknown> } };
                if (axiosErr.response?.data) {
                    const data = axiosErr.response.data;
                    if ("errors" in data) {
                        setErrors(data.errors as Record<string, string[]>);
                    } else if ("message" in data) {
                        setErrors({ password: [data.message as string] });
                    }
                }
            }
        } finally {
            setIsPending(false);
        }
    }, [resetToken, password, passwordConfirmation, navigate]);

    const passwordChecks = [
        { label: "8+ characters", passed: password.length >= 8 },
        { label: "Uppercase letter", passed: /[A-Z]/.test(password) },
        { label: "Number", passed: /[0-9]/.test(password) },
        { label: "Symbol", passed: /[^A-Za-z0-9]/.test(password) },
    ];
    const passedCount = passwordChecks.filter((c) => c.passed).length;
    const strengthLabel = passedCount <= 1 ? "Weak" : passedCount === 2 ? "Fair" : passedCount === 3 ? "Good" : "Strong";
    const strengthColor = passedCount <= 1 ? "bg-destructive" : passedCount === 2 ? "bg-amber-500" : passedCount === 3 ? "bg-blue-500" : "bg-emerald-500";

    return (
        <div className="coreDevDark min-h-screen w-full flex bg-background text-foreground font-sans">
            {/* Left Pane */}
            <div className="w-full lg:w-[40%] flex flex-col justify-center lg:justify-between px-8 py-12 lg:px-20 lg:py-16">
                <div className="w-full max-w-sm mx-auto lg:mx-0">
                    <div className="flex items-center gap-3 opacity-50 mb-16 lg:mb-24">
                        <img src="/images/coreDevlogo.png" alt="CoreDev Logo" className="w-8 h-8 object-contain" />
                        <span className="font-bold text-2xl tracking-wide">Server Monitoring</span>
                    </div>

                    <div>
                        <button
                            type="button"
                            onClick={() => {
                                if (step === 1) navigate("/login");
                                else setStep((s) => (s - 1) as Step);
                            }}
                            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 cursor-pointer"
                        >
                            <ChevronLeft className="w-4 h-4" />
                            {step === 1 ? "Back to login" : "Back"}
                        </button>

                        <h1 className="text-4xl font-semibold mb-2">
                            {step === 1 ? "Forgot Password" : step === 2 ? "Enter Code" : "New Password"}
                        </h1>
                        <p className="text-sm text-muted-foreground mb-12">
                            {step === 1
                                ? "Enter your email or username to receive a reset code"
                                : step === 2
                                    ? `Code sent to ${maskedEmail}`
                                    : "Enter your new password"}
                        </p>

                        {step === 1 && (
                            <form onSubmit={handleSendCode} className="space-y-6">
                                <div>
                                    <FloatingInput
                                        id="email"
                                        name="email"
                                        label={
                                            <span className="flex items-center gap-2">
                                                <Mail className="w-4 h-4 text-primary" />
                                                Email or Username
                                            </span>
                                        }
                                        type="text"
                                        autoComplete="username"
                                        value={email}
                                        onValueChange={(value) => setEmail(value)}
                                        required
                                        disabled={isPending}
                                        inputBg="bg-background"
                                        divClassName="border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary h-14"
                                        error={errors.email?.[0]}
                                    />
                                    {/* Additional error map if multiple errors returned, though FloatingInput handles the first via 'error' prop */}
                                    {errors.email?.length > 1 && errors.email.slice(1).map((e) => (
                                        <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                                    ))}
                                </div>
                                <button
                                    type="submit"
                                    disabled={isPending || !email}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3.5 rounded-md mt-8 transition-colors flex items-center justify-center gap-2"
                                >
                                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Send Code
                                </button>
                            </form>
                        )}

                        {step === 2 && (
                            <form onSubmit={handleVerifyCode} className="space-y-6">
                                <div>
                                    <FloatingInput
                                        id="code"
                                        name="code"
                                        label={
                                            <span className="flex items-center gap-2">
                                                <Key className="w-4 h-4 text-primary" />
                                                Reset Code
                                            </span>
                                        }
                                        type="text"
                                        inputMode="numeric"
                                        autoComplete="one-time-code"
                                        value={code}
                                        onValueChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
                                        required
                                        disabled={isPending}
                                        inputBg="bg-background"
                                        divClassName="border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary h-14"
                                        error={errors.code?.[0]}
                                    />
                                    {errors.code?.length > 1 && errors.code.slice(1).map((e) => (
                                        <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                                    ))}
                                </div>
                                <button
                                    type="submit"
                                    disabled={isPending || code.length !== 6}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3.5 rounded-md mt-8 transition-colors flex items-center justify-center gap-2"
                                >
                                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Verify Code
                                </button>
                                <div className="flex justify-center mt-4">
                                    <button
                                        type="button"
                                        onClick={handleResendCode}
                                        disabled={resendCooldown > 0 || isPending}
                                        className="text-sm text-primary hover:text-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                    >
                                        {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === 3 && (
                            <form onSubmit={handleResetPassword} className="space-y-6">
                                <div>
                                    <FloatingInput
                                        id="password"
                                        name="password"
                                        label={
                                            <span className="flex items-center gap-2">
                                                <Lock className="w-4 h-4 text-muted-foreground" />
                                                New Password
                                            </span>
                                        }
                                        type={showPassword ? "text" : "password"}
                                        autoComplete="new-password"
                                        value={password}
                                        onValueChange={(value) => setPassword(value)}
                                        required
                                        disabled={isPending}
                                        inputBg="bg-background"
                                        divClassName="border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary h-14"
                                        className="pr-10"
                                        error={errors.password?.[0]}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword((p) => !p)}
                                            disabled={isPending}
                                            className="mr-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </FloatingInput>
                                    
                                    {errors.password?.length > 1 && errors.password.slice(1).map((e) => (
                                        <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                                    ))}

                                    {password && (
                                        <div className="flex flex-col gap-1.5 mt-3">
                                            <div className="flex items-center gap-1.5">
                                                <div className="flex-1 grid grid-cols-4 gap-1">
                                                    {Array.from({ length: 4 }).map((_, i) => (
                                                        <div key={i} className={cn("h-1 rounded-full transition-colors", i < passedCount ? strengthColor : "bg-muted")} />
                                                    ))}
                                                </div>
                                                <span className={cn("text-[11px] font-medium shrink-0", passedCount <= 1 && "text-destructive", passedCount === 2 && "text-amber-500", passedCount === 3 && "text-blue-500", passedCount === 4 && "text-emerald-500")}>
                                                    {strengthLabel}
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                                                {passwordChecks.map((c) => (
                                                    <span key={c.label} className={cn("text-[11px] flex items-center gap-1", c.passed ? "text-emerald-500" : "text-muted-foreground")}>
                                                        {c.passed ? "✓" : "○"} {c.label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <FloatingInput
                                        id="password_confirmation"
                                        name="password_confirmation"
                                        label={
                                            <span className="flex items-center gap-2">
                                                <Lock className="w-4 h-4 text-muted-foreground" />
                                                Confirm Password
                                            </span>
                                        }
                                        type={showPasswordConfirmation ? "text" : "password"}
                                        autoComplete="new-password"
                                        value={passwordConfirmation}
                                        onValueChange={(value) => setPasswordConfirmation(value)}
                                        required
                                        disabled={isPending}
                                        inputBg="bg-background"
                                        divClassName="border-border focus-within:border-primary focus-within:ring-1 focus-within:ring-primary h-14"
                                        className="pr-10"
                                        error={errors.password_confirmation?.[0]}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswordConfirmation((p) => !p)}
                                            disabled={isPending}
                                            className="mr-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                                            tabIndex={-1}
                                        >
                                            {showPasswordConfirmation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </button>
                                    </FloatingInput>
                                    {errors.password_confirmation?.length > 1 && errors.password_confirmation.slice(1).map((e) => (
                                        <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                                    ))}
                                </div>
                                <button
                                    type="submit"
                                    disabled={isPending || !password || !passwordConfirmation}
                                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3.5 rounded-md mt-8 transition-colors flex items-center justify-center gap-2"
                                >
                                    {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Reset Password
                                </button>
                            </form>
                        )}

                    </div>
                </div>

                <div className="mt-12 w-full max-w-sm mx-auto lg:mx-0"></div>
            </div>

            {/* Right Pane */}
            <div className="hidden lg:flex lg:w-[60%] relative bg-muted overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1639066648921-82d4500abf1a?q=80&w=1587&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')" }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-40" />

                <div className="relative z-10 flex flex-col justify-center px-24 w-full">
                    <h2 className="text-3xl lg:text-4xl font-light leading-relaxed text-foreground max-w-lg mb-8">
                        Monitor system with ease, battery included metrics-dashboard, reports, flexible-configuration, easy-to-setup.
                    </h2>
                    <a
                        href="https://www.coredev.ph/"
                        target="_blank"
                        className="text-xs font-semibold text-muted-foreground uppercase tracking-widest underline underline-offset-4 hover:text-foreground transition-colors w-fit"
                    >
                        Learn More
                    </a>
                </div>
            </div>
        </div>
    );
}
