import { useState, type SubmitEvent } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";
import { useJwtAuth } from "@/hooks/useJwtAuth";
import { FloatingInput } from "@/components/ui/floatingInput";

export default function Login() {
    const { login, isLoggingIn } = useJwtAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [remember, setRemember] = useState(
        () => localStorage.getItem("login_remember") === "true",
    );

    const handleRememberChange = (checked: boolean) => {
        setRemember(checked);
        localStorage.setItem("login_remember", String(checked));
    };
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    const isPending = isLoggingIn;

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        setErrors({});

        try {
            await login({ email, password, remember });
            const returnTo = searchParams.get("returnTo");
            if (
                returnTo &&
                returnTo.startsWith("/") &&
                !returnTo.startsWith("//")
            ) {
                navigate(returnTo, { replace: true });
            } else {
                navigate("/", { replace: true });
            }
        } catch (err: unknown) {
            if (err && typeof err === "object" && "response" in err) {
                const axiosErr = err as {
                    response?: { data?: Record<string, unknown> };
                };
                if (axiosErr.response?.data) {
                    const data = axiosErr.response.data;
                    if ("errors" in data) {
                        setErrors(data.errors as Record<string, string[]>);
                    } else if ("message" in data) {
                        setErrors({ email: [data.message as string] });
                    }
                }
            } else if (err && typeof err === "object" && "errors" in err) {
                setErrors((err as { errors: Record<string, string[]> }).errors);
            } else if (err && typeof err === "object" && "message" in err) {
                setErrors({ email: [(err as { message: string }).message] });
            }
        }
    };

    return (
        <div className="coreDevDark min-h-screen w-full flex bg-background text-foreground font-sans">
            {/* Left Pane */}
            <div className="w-full lg:w-[40%] flex flex-col justify-center relative px-8 py-12 lg:px-20 lg:py-16">
                {/* Top Logo */}
                <div className="absolute top-10 left-8 lg:left-20 flex items-center gap-3">
                    <img
                        src="/images/coreDevlogo.png"
                        alt="CoreDev Logo"
                        className="w-15 h-15 object-contain"
                    />
                    <span className="font-bold text-3xl lg:text-3xl tracking-wide">
                        Server Monitoring
                    </span>
                </div>

                <div className="w-full max-w-sm mx-auto lg:ml-18 -mt-12">
                    <h1 className="text-4xl font-semibold mb-8">Sign In</h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email or Username */}
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
                        </div>

                        {/* Password */}
                        <div>
                            <FloatingInput
                                id="password"
                                name="password"
                                label={
                                    <span className="flex items-center gap-2">
                                        <Lock className="w-4 h-4 text-primary" />
                                        Password
                                    </span>
                                }
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
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
                                    {showPassword ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </FloatingInput>
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                                <input
                                    id="remember"
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) =>
                                        handleRememberChange(e.target.checked)
                                    }
                                    disabled={isPending}
                                    className="h-4 w-4 rounded border-border bg-transparent text-primary focus:ring-primary focus:ring-offset-background"
                                />
                                <label
                                    htmlFor="remember"
                                    className="text-sm text-foreground cursor-pointer select-none hover:text-primary transition-colors"
                                >
                                    Remember me
                                </label>
                            </div>
                            <Link
                                to="/forgot-password"
                                className="text-xs font-semibold text-foreground uppercase tracking-widest underline underline-offset-4 hover:text-primary transition-colors"
                            >
                                Forgot password?
                            </Link>
                        </div>

                        <button
                            id="auth-submit"
                            type="submit"
                            disabled={isPending}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3.5 rounded-md mt-8 transition-colors flex items-center justify-center gap-2"
                        >
                            {isPending && (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            )}
                            SIGN IN
                        </button>
                    </form>
                </div>
            </div>

            {/* Right Pane */}
            <div className="hidden lg:flex lg:w-[60%] relative bg-muted overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-luminosity"
                    style={{
                        backgroundImage:
                            "url('https://images.unsplash.com/photo-1639066648921-82d4500abf1a?q=80&w=1587&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-transparent opacity-80" />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent opacity-40" />

                <div className="relative z-10 flex flex-col justify-center px-24 w-full">
                    <h2 className="text-3xl lg:text-4xl font-light leading-relaxed text-foreground max-w-lg mb-8">
                        Monitor system with ease, battery included
                        metrics-dashboard, reports, flexible-configuration,
                        easy-to-setup.
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
