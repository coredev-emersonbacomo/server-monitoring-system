import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

export default function PageLayout({
    className,
    children,
    ...props
}: ComponentProps<"div">) {
    return (
        <div
            className={cn(
                "flex-1 flex flex-col min-h-0 bg-background text-foreground",
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}
