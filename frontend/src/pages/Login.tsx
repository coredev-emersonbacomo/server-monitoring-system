import { useState, type SubmitEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Server, Activity, Shield, Cpu } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuthContext";

export default function Login() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
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
            navigate(searchParams.get("returnTo") || "/");
        } catch (err: unknown) {
            if (err && typeof err === "object" && "errors" in err) {
                setErrors((err as { errors: Record<string, string[]> }).errors);
            } else if (err && typeof err === "object" && "message" in err) {
                setErrors({ email: [(err as { message: string }).message] });
            }
        }
    };

    return (
        <div className="min-h-screen flex bg-background">
            <div className="hidden lg:flex flex-1 relative overflow-hidden bg-linear-to-br from-primary/5 via-primary/10 to-primary/5">
                <div className="absolute inset-0">
                    <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
                    <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
                    <div className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full bg-chart-2/5 blur-3xl" />
                </div>

                <div className="relative z-10 flex flex-col justify-center px-16 lg:px-20 xl:px-28 max-w-2xl">
                    <div className="flex items-center gap-3 mb-10">
                        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                            <Server className="w-5 h-5 text-primary-foreground" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">Server Monitor</span>
                    </div>

                    <h2 className="text-4xl font-bold tracking-tight mb-4 leading-tight">
                        Real-time server<br />
                        monitoring at a glance
                    </h2>
                    <p className="text-lg text-muted-foreground mb-12 leading-relaxed">
                        Track CPU, memory, network, and disk usage across all your servers.
                        Get instant alerts, historical insights, and full control from one dashboard.
                    </p>

                    <div className="space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                                <Activity className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium">Live Metrics</p>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Real-time CPU, memory, and network graphs updated every second
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                                <Shield className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium">Role-based Access</p>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Granular permissions for teams of any size
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                                <Cpu className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <p className="font-medium">Multi-cluster Support</p>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Organise servers into co-ops and manage them as groups
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-sm">
                    <div className="lg:hidden flex flex-col items-center mb-8">
                        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center mb-4">
                            <Server className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <h1 className="text-2xl font-semibold text-foreground">Server Monitor</h1>
                        <p className="text-sm text-muted-foreground mt-1">Sign in to your account</p>
                    </div>

                    <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
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
                                    className="w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
                                />
                                {errors.email?.map((e) => (
                                    <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                                ))}
                            </div>

                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
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
                                    <p key={e} className="text-xs text-destructive mt-1">{e}</p>
                                ))}
                            </div>

                            <button
                                id="auth-submit"
                                type="submit"
                                disabled={isPending}
                                className="w-full h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium shadow hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                            >
                                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                                Sign in
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
