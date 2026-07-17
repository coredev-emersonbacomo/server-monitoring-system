import { type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariantsCva = cva(
    "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                danger: "bg-red-600 text-white hover:bg-red-700",
                outline:
                    "border border-border bg-transparent hover:bg-muted text-foreground",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                ghost: "hover:bg-muted text-foreground",
                link: "text-primary underline-offset-4 hover:underline p-0 h-auto",
            },
            size: {
                default: "h-9 px-4 py-2",
                sm: "h-8 px-3 py-1 text-xs",
                lg: "h-10 px-6 py-2 text-base",
                icon: "h-9 w-9 p-0",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

interface ButtonProps
    extends
        ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariantsCva> {
    icon?: React.ReactNode;
    label?: string;
}

export function Button({
    variant,
    size,
    icon,
    label,
    className,
    children,
    ...props
}: ButtonProps) {
    return (
        <button
            className={cn(buttonVariantsCva({ variant, size }), className)}
            {...props}
        >
            {icon}
            {label ?? children}
        </button>
    );
}
