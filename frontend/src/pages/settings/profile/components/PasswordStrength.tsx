import { cn } from "@/lib/utils";

export function PasswordStrength({ password }: { password: string }) {
    const checks = [
        { label: "8+ characters", passed: password.length >= 8 },
        { label: "Uppercase letter", passed: /[A-Z]/.test(password) },
        { label: "Number", passed: /[0-9]/.test(password) },
        { label: "Symbol", passed: /[^A-Za-z0-9]/.test(password) },
    ];
    const passedCount = checks.filter((c) => c.passed).length;

    const strengthLabel =
        passedCount <= 1
            ? "Weak"
            : passedCount === 2
              ? "Fair"
              : passedCount === 3
                ? "Good"
                : "Strong";
    const strengthColor =
        passedCount <= 1
            ? "bg-destructive"
            : passedCount === 2
              ? "bg-amber-500"
              : passedCount === 3
                ? "bg-blue-500"
                : "bg-emerald-500";

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5">
                <div className="flex-1 grid grid-cols-4 gap-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div
                            key={i}
                            className={cn(
                                "h-1 rounded-full transition-colors",
                                i < passedCount ? strengthColor : "bg-muted",
                            )}
                        />
                    ))}
                </div>
                <span
                    className={cn(
                        "text-[11px] font-medium shrink-0",
                        passedCount <= 1 && "text-destructive",
                        passedCount === 2 && "text-amber-500",
                        passedCount === 3 && "text-blue-500",
                        passedCount === 4 && "text-emerald-500",
                    )}
                >
                    {strengthLabel}
                </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1">
                {checks.map((c) => (
                    <span
                        key={c.label}
                        className={cn(
                            "text-[11px] flex items-center gap-1",
                            c.passed
                                ? "text-emerald-500"
                                : "text-muted-foreground",
                        )}
                    >
                        {c.passed ? "✓" : "○"} {c.label}
                    </span>
                ))}
            </div>
        </div>
    );
}
