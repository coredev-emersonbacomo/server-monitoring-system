import { useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Server } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuthContext";

type Mode = "login" | "register";

export default function Login() {
    const navigate = useNavigate();
    const { login, register, isLoggingIn, isRegistering } = useAuthContext();

    const [mode, setMode] = useState<Mode>("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirmation, setPasswordConfirmation] = useState("");
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    const isPending = isLoggingIn || isRegistering;

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        setErrors({});

        try {
            if (mode === "login") {
                await login({ email, password });
            } else {
                await register({
                    name,
                    email,
                    password,
                    password_confirmation: passwordConfirmation,
                });
            }
            navigate("/");
        } catch (err: unknown) {
            // Parse Laravel validation errors
            if (err && typeof err === "object" && "errors" in err) {
                setErrors((err as { errors: Record<string, string[]> }).errors);
            } else if (err && typeof err === "object" && "message" in err) {
                setErrors({ email: [(err as { message: string }).message] });
            }
        }
    };

    const toggleMode = () => {
        setMode((m) => (m === "login" ? "register" : "login"));
        setErrors({});
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                        <Server className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        Server Monitor
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {mode === "login"
                            ? "Sign in to your account"
                            : "Create a new account"}
                    </p>
                </div>

                {/* Card */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {mode === "register" && (
                            <div>
                                <label
                                    htmlFor="name"
                                    className="block text-sm font-medium text-foreground mb-1.5"
                                >
                                    Name
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    autoComplete="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    required
                                    disabled={isPending}
                                    placeholder="John Doe"
                                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                                />
                                {errors.name?.map((e) => (
                                    <p
                                        key={e}
                                        className="text-xs text-destructive mt-1"
                                    >
                                        {e}
                                    </p>
                                ))}
                            </div>
                        )}

                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-foreground mb-1.5"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                type="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                disabled={isPending}
                                placeholder="you@example.com"
                                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                            />
                            {errors.email?.map((e) => (
                                <p
                                    key={e}
                                    className="text-xs text-destructive mt-1"
                                >
                                    {e}
                                </p>
                            ))}
                        </div>

                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-foreground mb-1.5"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                autoComplete={
                                    mode === "login"
                                        ? "current-password"
                                        : "new-password"
                                }
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isPending}
                                placeholder="••••••••"
                                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                            />
                            {errors.password?.map((e) => (
                                <p
                                    key={e}
                                    className="text-xs text-destructive mt-1"
                                >
                                    {e}
                                </p>
                            ))}
                        </div>

                        {mode === "register" && (
                            <div>
                                <label
                                    htmlFor="password_confirmation"
                                    className="block text-sm font-medium text-foreground mb-1.5"
                                >
                                    Confirm Password
                                </label>
                                <input
                                    id="password_confirmation"
                                    type="password"
                                    autoComplete="new-password"
                                    value={passwordConfirmation}
                                    onChange={(e) =>
                                        setPasswordConfirmation(e.target.value)
                                    }
                                    required
                                    disabled={isPending}
                                    placeholder="••••••••"
                                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                                />
                                {errors.password_confirmation?.map((e) => (
                                    <p
                                        key={e}
                                        className="text-xs text-destructive mt-1"
                                    >
                                        {e}
                                    </p>
                                ))}
                            </div>
                        )}

                        <button
                            id="auth-submit"
                            type="submit"
                            disabled={isPending}
                            className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium shadow hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                        >
                            {isPending && (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            )}
                            {mode === "login" ? "Sign in" : "Create account"}
                        </button>
                    </form>
                </div>

                {/* Toggle mode */}
                <p className="text-center text-sm text-muted-foreground mt-4">
                    {mode === "login" ? (
                        <>
                            Don&apos;t have an account?{" "}
                            <button
                                id="toggle-register"
                                onClick={toggleMode}
                                className="text-foreground font-medium hover:underline"
                            >
                                Sign up
                            </button>
                        </>
                    ) : (
                        <>
                            Already have an account?{" "}
                            <button
                                id="toggle-login"
                                onClick={toggleMode}
                                className="text-foreground font-medium hover:underline"
                            >
                                Sign in
                            </button>
                        </>
                    )}
                </p>
            </div>
        </div>
    );
}
