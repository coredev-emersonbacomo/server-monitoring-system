import { type ButtonHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "outline" | "danger";
    icon?: React.ReactNode;
    label?: string;
}

export function Button({ variant, icon, label, className, children, ...props }: ButtonProps) {
    return (
        <button
            className={twMerge(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
                variant === "outline" && "border border-border bg-transparent hover:bg-muted",
                !variant && "bg-primary text-primary-foreground hover:bg-primary/90",
                className,
            )}
            {...props}
        >
            {icon}
            {label || children}
        </button>
    );
}
