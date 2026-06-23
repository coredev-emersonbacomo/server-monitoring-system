import { useState, type SubmitEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Server, Eye, EyeOff } from "lucide-react";
import { useJwtAuth } from "@/hooks/useJwtAuth";

export default function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { login, isLoggingIn } = useJwtAuth();

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
            navigate(searchParams.get("returnTo") || "/");
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
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
            <div className="w-full max-w-sm">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                        <Server className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        Server Monitor
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Sign in to your account
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-foreground mb-1.5"
                        >
                            Email or Username
                        </label>
                        <input
                            id="email"
                            type="text"
                            autoComplete="username"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isPending}
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
                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isPending}
                                className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 pr-9 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((p) => !p)}
                                disabled={isPending}
                                className="absolute right-0 top-0 h-full px-3 text-muted-foreground hover:text-foreground disabled:opacity-50"
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <EyeOff className="w-4 h-4" />
                                ) : (
                                    <Eye className="w-4 h-4" />
                                )}
                            </button>
                        </div>
                        {errors.password?.map((e) => (
                            <p
                                key={e}
                                className="text-xs text-destructive mt-1"
                            >
                                {e}
                            </p>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <input
                            id="remember"
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => handleRememberChange(e.target.checked)}
                            disabled={isPending}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <label
                            htmlFor="remember"
                            className="text-sm text-muted-foreground cursor-pointer select-none"
                        >
                            Remember me
                        </label>
                    </div>

                    <button
                        id="auth-submit"
                        type="submit"
                        disabled={isPending}
                        className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium shadow hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                    >
                        {isPending && (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        )}
                        Sign in
                    </button>
                </form>
            </div>
        </div>
    );
}
