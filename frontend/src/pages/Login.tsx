import { useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Server } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuthContext";

export default function Login() {
    const navigate = useNavigate();
    const { login, isLoggingIn } = useAuthContext();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<Record<string, string[]>>({});

    const isPending = isLoggingIn;

    const handleSubmit = async (e: SubmitEvent) => {
        e.preventDefault();
        setErrors({});

        try {
            await login({ email, password });
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
                        Sign in to your account
                    </p>
                </div>

                {/* Card */}
                <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                    <form onSubmit={handleSubmit} className="space-y-4">
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
                                placeholder="john.doe@example.com"
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
                                autoComplete="current-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                disabled={isPending}
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
        </div>
    );
}
