import { Banknote, Coins, Calendar, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useServerDetailContext } from "../context/ServerDetailContext";

export function BillingTab() {
    const { initial, setShowCostModal } = useServerDetailContext();
    return (
        <div className="flex flex-col gap-6 p-6 bg-card border border-border/60 rounded-b-xl shadow-sm">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Monthly Rate */}
                <div className="flex items-center gap-3.5 p-4 rounded-xl bg-primary/5 border border-primary/20 shadow-sm">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Banknote size={18} />
                    </div>
                    <div className="flex flex-col min-w-0 gap-0.5">
                        <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/80 flex items-center gap-1.5">
                            Monthly Rate
                        </span>
                        <span className="text-base font-semibold text-foreground font-mono">
                            ₱{(initial?.monthly_rate ?? 0).toFixed(2)} / mo
                        </span>
                    </div>
                </div>

                {/* Running Balance */}
                <div
                    onClick={() => setShowCostModal(true)}
                    className="group flex items-center gap-3.5 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 shadow-sm hover:border-emerald-500/60 hover:bg-emerald-500/15 transition-all cursor-pointer"
                    title="Click to view details or manage deductions"
                >
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                        <Coins size={18} />
                    </div>
                    <div className="flex flex-col min-w-0 gap-0.5">
                        <span className="text-[10.5px] font-medium uppercase tracking-wider text-emerald-400/90">
                            Running Balance
                        </span>
                        <span className="text-base font-bold text-emerald-400 font-mono">
                            ₱
                            {(initial?.accumulated_cost ?? 0).toLocaleString(
                                undefined,
                                {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                },
                            )}
                        </span>
                    </div>
                </div>

                {/* Next Billing Date */}
                <div className="flex items-center gap-3.5 p-4 rounded-xl bg-card border border-border/60 shadow-sm">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10 text-primary shrink-0">
                        <Calendar size={18} />
                    </div>
                    <div className="flex flex-col min-w-0 gap-0.5">
                        <span className="text-[10.5px] font-medium uppercase tracking-wider text-muted-foreground/80">
                            Next Billing Date
                        </span>
                        <span className="text-base font-semibold text-foreground wrap-break-word">
                            {initial?.billing_date
                                ? new Date(
                                    initial.billing_date,
                                ).toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                })
                                : "N/A"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Financial Overview & Actions Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                {/* Account Summary */}
                <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/20 border border-border/60">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground pb-2 border-b border-border/40">
                        <Receipt size={16} className="text-primary" />
                        Billing Breakdown
                    </div>

                    <div className="flex justify-between items-center text-xs py-1">
                        <span className="text-muted-foreground">
                            Monthly Base Rate
                        </span>
                        <span className="font-mono font-medium text-foreground">
                            ₱{(initial?.monthly_rate ?? 0).toFixed(2)}
                        </span>
                    </div>

                    <div className="flex justify-between items-center text-xs py-1">
                        <span className="text-muted-foreground">
                            Recorded Payments (Remitted)
                        </span>
                        <span className="font-mono font-medium text-emerald-400">
                            ₱{(initial?.remitted ?? 0).toFixed(2)}
                        </span>
                    </div>

                    <div className="flex justify-between items-center text-xs py-1">
                        <span className="text-muted-foreground">
                            Current Payment Due
                        </span>
                        <span className="font-mono font-medium text-amber-400">
                            ₱{(initial?.net_cost ?? 0).toFixed(2)}
                        </span>
                    </div>

                    <div className="flex justify-between items-center text-xs pt-2 border-t border-border/40 font-semibold">
                        <span className="text-foreground">
                            Total Running Balance
                        </span>
                        <span className="font-mono text-emerald-400 text-sm">
                            ₱{(initial?.accumulated_cost ?? 0).toFixed(2)}
                        </span>
                    </div>
                </div>

                {/* Quick Actions & Payment Management */}
                <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/20 border border-border/60">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground pb-2 border-b border-border/40">
                        <Coins size={16} className="text-emerald-400" />
                        Payment & Deduction Actions
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                        Record a payment or deduction for this server, adjust
                        cost baselines, and review historical payment
                        transactions.
                    </p>

                    <div className="mt-auto pt-2">
                        <Button
                            variant="default"
                            size="sm"
                            className="w-full"
                            icon={<Coins size={14} />}
                            label="Manage Payments & Deductions"
                            onClick={() => setShowCostModal(true)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
