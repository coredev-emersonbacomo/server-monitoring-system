import { Coins, Banknote, CreditCard, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useServerDetailContext } from "../context/ServerDetailContext";

export function CostModal() {
    const {
        showCostModal,
        setShowCostModal,
        initial,
        costLogs,
        isLoadingCostLogs,
        deductAmount,
        setDeductAmount,
        submittingPayment,
        handleCostAdjustment,
    } = useServerDetailContext();

    return (
        <Dialog open={showCostModal} onOpenChange={setShowCostModal}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Coins className="text-emerald-400" size={20} />
                        Payment & Financial Management
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-6">
                    {/* Top Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3 bg-muted/20 border border-border/60 rounded-lg flex flex-col">
                            <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                Monthly Rate
                            </span>
                            <span className="text-base font-bold text-foreground font-mono mt-0.5">
                                ₱{(initial?.monthly_rate ?? 0).toFixed(2)}
                            </span>
                        </div>
                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex flex-col">
                            <span className="text-[10px] text-emerald-400 uppercase font-medium">
                                Total Balance
                            </span>
                            <span className="text-base font-bold text-emerald-400 font-mono mt-0.5">
                                ₱
                                {(
                                    initial?.accumulated_cost ?? 0
                                ).toLocaleString(undefined, {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })}
                            </span>
                        </div>
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex flex-col">
                            <span className="text-[10px] text-amber-400 uppercase font-medium">
                                Payment Due
                            </span>
                            <span className="text-base font-bold text-amber-400 font-mono mt-0.5">
                                ₱
                                {(initial?.net_cost ?? 0).toLocaleString(
                                    undefined,
                                    {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                    },
                                )}
                            </span>
                        </div>
                    </div>

                    {/* Quick Payment Action */}
                    <div className="flex flex-col gap-3 p-4 bg-muted/30 border border-border/60 rounded-xl">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <CreditCard size={14} className="text-primary" />
                            Record New Transaction
                        </span>

                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex-1">
                                <Input
                                    type="number"
                                    step="0.01"
                                    placeholder="Enter amount (e.g. 500.00)"
                                    value={deductAmount}
                                    onChange={(e) =>
                                        setDeductAmount(e.target.value)
                                    }
                                    className="font-mono text-sm"
                                />
                            </div>
                            <Button
                                variant="default"
                                size="sm"
                                disabled={
                                    submittingPayment ||
                                    !deductAmount ||
                                    Number(deductAmount) <= 0
                                }
                                onClick={() =>
                                    handleCostAdjustment(
                                        "deduction",
                                        Number(deductAmount),
                                    )
                                }
                                label={
                                    submittingPayment
                                        ? "Saving..."
                                        : "Record Payment"
                                }
                            />
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={
                                    submittingPayment ||
                                    (initial?.net_cost ?? 0) <= 0
                                }
                                onClick={() =>
                                    handleCostAdjustment("full_payment")
                                }
                                label={`Pay Full Due (₱${(
                                    initial?.net_cost ?? 0
                                ).toFixed(2)})`}
                                className="text-xs text-emerald-400 hover:text-emerald-300 border-emerald-500/30"
                            />
                            <Button
                                variant="outline"
                                size="sm"
                                disabled={submittingPayment}
                                onClick={() =>
                                    handleCostAdjustment("reset_usage")
                                }
                                label="Reset Balance Baseline"
                                className="text-xs text-amber-500 hover:text-amber-400 border-amber-500/30"
                            />
                        </div>
                    </div>

                    {/* Historical Transactions */}
                    <div className="flex flex-col gap-3">
                        <span className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <History size={14} className="text-muted-foreground" />
                            Payment & Adjustment History
                        </span>

                        {isLoadingCostLogs ? (
                            <div className="py-6 text-center text-xs text-muted-foreground animate-pulse">
                                Loading history...
                            </div>
                        ) : costLogs && costLogs.length > 0 ? (
                            <div className="max-h-56 overflow-y-auto border border-border/40 rounded-lg">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/40 sticky top-0">
                                        <tr className="border-b border-border/40 text-muted-foreground font-medium">
                                            <th className="p-2.5">Date</th>
                                            <th className="p-2.5">Action</th>
                                            <th className="p-2.5 text-right">
                                                Amount
                                            </th>
                                            <th className="p-2.5 text-right">
                                                Balance After
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20 font-mono">
                                        {costLogs.map((log: any) => (
                                            <tr
                                                key={log.id}
                                                className="hover:bg-muted/10"
                                            >
                                                <td className="p-2.5 text-muted-foreground font-sans">
                                                    {new Date(
                                                        log.created_at,
                                                    ).toLocaleString()}
                                                </td>
                                                <td className="p-2.5 capitalize font-sans text-foreground">
                                                    {log.action_type?.replace(
                                                        "_",
                                                        " ",
                                                    ) ?? "adjustment"}
                                                </td>
                                                <td className="p-2.5 text-right text-emerald-400">
                                                    ₱
                                                    {Number(
                                                        log.amount ?? 0,
                                                    ).toFixed(2)}
                                                </td>
                                                <td className="p-2.5 text-right text-muted-foreground">
                                                    ₱
                                                    {Number(
                                                        log.balance_after ?? 0,
                                                    ).toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-6 text-center text-xs text-muted-foreground bg-muted/10 border border-border/40 rounded-lg">
                                No payment logs recorded yet.
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-border/40">
                    <DialogClose asChild>
                        <Button variant="outline" label="Close" />
                    </DialogClose>
                </div>
            </DialogContent>
        </Dialog>
    );
}
