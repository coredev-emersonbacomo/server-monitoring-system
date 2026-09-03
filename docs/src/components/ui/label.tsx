import { type LabelHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Label = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
    function Label({ className, ...props }, ref) {
        return (
            <label
                ref={ref}
                className={cn(
                    "block text-sm font-medium text-foreground mb-1.5",
                    className,
                )}
                {...props}
            />
        );
    },
);
