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
                "w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:opacity-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50 [&:-webkit-autofill]:[-webkit-text-fill-color:var(--foreground)] [&:-webkit-autofill]:[transition:background-color_99999s_ease-in-out_0s] [&:-webkit-autofill]:shadow-[0_0_0px_1000px_transparent_inset]",
                className,
            )}
            {...props}
        />
    );
});
