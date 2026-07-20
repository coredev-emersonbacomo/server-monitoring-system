import { useState, useEffect, useCallback, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Server, ChevronLeft, Eye, EyeOff } from "lucide-react";
import { FloatingInput } from "@/components/ui/floatingInput";
import { cn } from "@/lib/utils";
import axios from "axios";

type Step = 1 | 2 | 3;

export default function ForgotPassword() {
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
    const [resendCooldown, setResendCooldown] = useState(0);

    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setInterval(() => {
            setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
        }, 1000);
        return () => clearInterval(timer);
    }, [resendCooldown]);

    const handleSendCode = useCallback(async (e: SubmitEvent) => {
        e.preventDefault();
        setErrors({});
        setIsPending(true);
        try {
            const { data } = await axios.post("/api/v1/forgot-password", { email });
            setMaskedEmail(data.masked_email);
            setStep(2);
            setResendCooldown(60);
        } catch (err: unknown) {
            if (err && typeof err === "object" && "response" in err) {
                const axiosErr = err as { response?: { data?: Record<string, unknown> } };
                if (axiosErr.response?.data) {
                    const data = axiosErr.response.data;
                    if ("errors" in data) {
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
            setResendCooldown(60);
        } catch {
            // Silent fail on resend
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
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
            <div className="w-full max-w-sm">
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

                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                        <Server className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {step === 1 ? "Forgot Password" : step === 2 ? "Enter Code" : "New Password"}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1 text-center">
                        {step === 1
                            ? "Enter your email or username to receive a reset code"
                            : step === 2
                                ? `Code sent to ${maskedEmail}`
                                : "Enter your new password"}
                    </p>
                </div>

                {step === 1 && (
                    <form onSubmit={handleSendCode} className="space-y-4">
                        <div>
                            <FloatingInput
                                id="email"
                                label="Email or Username"
                                type="text"
                                autoComplete="username"
                                value={email}
                                onValueChange={(value) => setEmail(value)}
                                required
                                disabled={isPending}
                                inputBg="bg-background"
                                className={cn(errors.email && "border-destructive")}
                            />
                            {errors.email?.map((e) => (
                                <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                            ))}
                        </div>
                        <button
                            type="submit"
                            disabled={isPending || !email}
                            className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium shadow hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Send Code
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyCode} className="space-y-4">
                        <div>
                            <FloatingInput
                                id="code"
                                label="Reset Code"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                value={code}
                                onValueChange={(value) => setCode(value.replace(/\D/g, "").slice(0, 6))}
                                required
                                disabled={isPending}
                                inputBg="bg-background"
                                className={cn(errors.code && "border-destructive")}
                            />
                            {errors.code?.map((e) => (
                                <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                            ))}
                        </div>
                        <button
                            type="submit"
                            disabled={isPending || code.length !== 6}
                            className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium shadow hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Verify Code
                        </button>
                        <div className="flex justify-center">
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
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <div className="relative">
                                <FloatingInput
                                    id="password"
                                    label="New Password"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={password}
                                    onValueChange={(value) => setPassword(value)}
                                    required
                                    disabled={isPending}
                                    inputBg="bg-background"
                                    className={cn("pr-9", errors.password && "border-destructive")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword((p) => !p)}
                                    disabled={isPending}
                                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground disabled:opacity-50"
                                    tabIndex={-1}
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password?.map((e) => (
                                <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                            ))}
                            {password && (
                                <div className="flex flex-col gap-1.5 mt-2">
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
                                    <div className="flex flex-wrap gap-x-3 gap-y-1">
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
                            <div className="relative">
                                <FloatingInput
                                    id="password_confirmation"
                                    label="Confirm Password"
                                    type={showPasswordConfirmation ? "text" : "password"}
                                    autoComplete="new-password"
                                    value={passwordConfirmation}
                                    onValueChange={(value) => setPasswordConfirmation(value)}
                                    required
                                    disabled={isPending}
                                    inputBg="bg-background"
                                    className={cn("pr-9", errors.password_confirmation && "border-destructive")}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordConfirmation((p) => !p)}
                                    disabled={isPending}
                                    className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground disabled:opacity-50"
                                    tabIndex={-1}
                                >
                                    {showPasswordConfirmation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            {errors.password_confirmation?.map((e) => (
                                <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                            ))}
                        </div>
                        <button
                            type="submit"
                            disabled={isPending || !password || !passwordConfirmation}
                            className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium shadow hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Reset Password
                        </button>
                    </form>
                )}

                <div className="flex justify-center mt-6">
                    <div className="flex items-center gap-2">
                        {[1, 2, 3].map((s) => (
                            <div
                                key={s}
                                className={cn(
                                    "w-2 h-2 rounded-full transition-all",
                                    s === step ? "bg-primary scale-125" : s < step ? "bg-primary/30" : "bg-muted",
                                )}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
