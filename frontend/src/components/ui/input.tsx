import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<
    HTMLInputElement,
    InputHTMLAttributes<HTMLInputElement>
>(function Input({ className, ...props }, ref) {
    return (
        <input
            ref={ref}
            className={cn(
                "w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 autofill:bg-transparent [&:-webkit-autofill]:bg-transparent",
                className,
            )}
            {...props}
        />
    );
});
