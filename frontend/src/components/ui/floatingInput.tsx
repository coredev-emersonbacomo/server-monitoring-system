import { forwardRef, useState, type InputHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface FloatingInputProps extends InputHTMLAttributes<HTMLInputElement> {
    label: string;
    labelBg?: string;
}

export const FloatingInput = forwardRef<HTMLInputElement, FloatingInputProps>(
    function FloatingInput({ className, label, labelBg = "bg-background", id, value, onFocus, onBlur, ...props }, ref) {
        const [focused, setFocused] = useState(false);
        const inputId = id ?? label.replace(/\s+/g, "-").toLowerCase();
        const hasValue = value !== undefined && value !== "";
        const floated = focused || hasValue;

        return (
            <div className="relative">
                <Input
                    ref={ref}
                    id={inputId}
                    value={value}
                    onFocus={(e) => {
                        setFocused(true);
                        onFocus?.(e);
                    }}
                    onBlur={(e) => {
                        setFocused(false);
                        onBlur?.(e);
                    }}
                    className={className}
                    {...props}
                />
                <label
                    htmlFor={inputId}
                    className={cn(
                        "pointer-events-none absolute left-3 px-1 text-muted-foreground transition-all duration-150",
                        floated
                            ? cn("-top-2 text-xs px-1 font-semibold text-foreground", labelBg)
                            : "top-1/2 -translate-y-1/2 text-sm",
                        focused && "text-ring",
                    )}
                >
                    {label}
                </label>
            </div>
        );
    },
);