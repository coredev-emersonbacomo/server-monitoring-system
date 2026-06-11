import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Shield, ShieldCheck } from "lucide-react";

export default function Login() {
    const [email, setEmail] = useState("ops@company.com");
    const [password, setPassword] = useState("•••••••••••••");
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle secure login logic here
        console.log("Logging in with:", { email, password, rememberMe });
    };

    return (
        <div className="flex min-h-screen bg-[#070d19] text-white font-sans selection:bg-blue-600">
            {/* LEFT SIDE: Information & Stats Dashboard Preview */}
            <div className="hidden md:flex flex-col justify-between w-7/12 p-16 relative overflow-hidden bg-radial-grid">
                {/* Decorative Grid Background Effect */}
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#111827_1px,transparent_1px),linear-gradient(to_bottom,#111827_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-25"></div>

                {/* Logo Header */}
                <div className="relative z-10 flex items-center gap-3">
                    <div className="p-2 border border-blue-500/30 rounded-lg bg-blue-950/20">
                        <Shield className="w-6 h-6 text-blue-500" />
                    </div>
                    <span className="text-sm font-semibold tracking-widest text-slate-400 uppercase">
                        NEXUSSEC
                    </span>
                </div>

                {/* Main Content Text */}
                <div className="relative z-10 max-w-xl my-auto space-y-6">
                    <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-emerald-400 uppercase">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        All Systems Operational
                    </div>

                    <h1 className="text-4xl lg:text-5xl font-bold tracking-tight leading-tight">
                        Server Monitoring <br />
                        <span className="text-blue-500">Command Center</span>
                    </h1>

                    <p className="text-slate-400 text-base leading-relaxed">
                        Real-time visibility across your entire infrastructure.
                        Detect anomalies, respond to incidents, and keep your
                        systems secure.
                    </p>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 pt-6">
                        <div className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-xl backdrop-blur-sm">
                            <div className="text-2xl font-bold text-blue-500">
                                2,847
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                Servers
                            </div>
                        </div>
                        <div className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-xl backdrop-blur-sm">
                            <div className="text-2xl font-bold text-blue-500">
                                99.98%
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                Uptime
                            </div>
                        </div>
                        <div className="p-4 bg-slate-900/40 border border-slate-800/60 rounded-xl backdrop-blur-sm">
                            <div className="text-2xl font-bold text-blue-500">
                                3 Active
                            </div>
                            <div className="text-xs text-slate-500 mt-1">
                                Alerts
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Feature Pill Tags */}
                <div className="relative z-10 flex gap-6 text-xs text-slate-500 font-medium">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />{" "}
                        Threat Detection
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{" "}
                        Log Analysis
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />{" "}
                        Compliance
                    </div>
                </div>
            </div>

            {/* RIGHT SIDE: Secure Login Portal */}
            <div className="w-full md:w-5/12 bg-[#0b1322] flex flex-col justify-between p-8 md:p-16 border-l border-slate-900">
                {/* Top Spacer / Optional Quick Nav */}
                <div className="flex justify-end">
                    <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-800 rounded-lg text-xs bg-slate-900/50 text-slate-400">
                        <Lock className="w-3.5 h-3.5 text-blue-500" />
                        <span>SECURE ACCESS PORTAL</span>
                    </div>
                </div>

                {/* Central Login Form Area */}
                <div className="max-w-md w-full mx-auto my-auto space-y-8">
                    <div>
                        <h2 className="text-3xl font-semibold tracking-tight">
                            Welcome back
                        </h2>
                        <p className="text-sm text-slate-400 mt-2">
                            Securely access your server monitoring dashboard.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Email Address Input */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                                Email Address
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                                    <Mail className="w-5 h-5" />
                                </span>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 bg-[#0e1726] border border-slate-800/80 rounded-xl focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 text-sm text-slate-200 transition-all placeholder:text-slate-600"
                                    placeholder="name@company.com"
                                    required
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                                Password
                            </label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                                    <Lock className="w-5 h-5" />
                                </span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    className="w-full pl-12 pr-12 py-3.5 bg-[#0e1726] border border-slate-800/80 rounded-xl focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 text-sm text-slate-200 tracking-wide transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPassword(!showPassword)
                                    }
                                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? (
                                        <EyeOff className="w-5 h-5" />
                                    ) : (
                                        <Eye className="w-5 h-5" />
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer select-none text-slate-400 hover:text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) =>
                                        setRememberMe(e.target.checked)
                                    }
                                    className="w-4 h-4 rounded border-slate-800 bg-[#0e1726] text-blue-600 focus:ring-blue-500/50 focus:ring-offset-0"
                                />
                                <span>Remember this device</span>
                            </label>
                            <a
                                href="#forgot"
                                className="text-blue-500 hover:text-blue-400 transition-colors font-medium"
                            >
                                Forgot password?
                            </a>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium py-3.5 px-4 rounded-xl shadow-lg shadow-blue-600/10 hover:shadow-blue-600/20 transition-all transform active:scale-[0.99]"
                        >
                            <ShieldCheck className="w-5 h-5" />
                            <span>Sign In Securely</span>
                        </button>
                    </form>

                    {/* TLS Encryption Note */}
                    <div className="flex items-start gap-2.5 text-xs text-slate-500 leading-normal pt-2">
                        <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                        <p>
                            All sessions are encrypted with TLS 1.3 and
                            monitored for suspicious activity.
                        </p>
                    </div>
                </div>

                {/* Footer info links */}
                <div className="flex items-center justify-between text-xs text-slate-600 pt-8 border-t border-slate-900/60">
                    <span>© 2026 NexusSec Inc.</span>
                    <div className="flex gap-4">
                        <a
                            href="#privacy"
                            className="hover:text-slate-400 transition-colors"
                        >
                            Privacy
                        </a>
                        <a
                            href="#terms"
                            className="hover:text-slate-400 transition-colors"
                        >
                            Terms
                        </a>
                        <a
                            href="#support"
                            className="hover:text-slate-400 transition-colors"
                        >
                            Support
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
