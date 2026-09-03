import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

function Select({
    ...props
}: React.ComponentProps<typeof SelectPrimitive.Select>) {
    return <SelectPrimitive.Select data-slot="select" {...props} />;
}

function SelectTrigger({
    className,
    children,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.SelectTrigger>) {
    return (
        <SelectPrimitive.SelectTrigger
            data-slot="select-trigger"
            className={cn(
                "flex h-8 w-full items-center justify-between gap-1 rounded-lg border border-border bg-background px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:truncate",
                className,
            )}
            {...props}
        >
            {children}
            <SelectPrimitive.SelectIcon>
                <ChevronDown className="size-3 shrink-0 text-muted-foreground" />
            </SelectPrimitive.SelectIcon>
        </SelectPrimitive.SelectTrigger>
    );
}

function SelectValue({
    ...props
}: React.ComponentProps<typeof SelectPrimitive.SelectValue>) {
    return <SelectPrimitive.SelectValue data-slot="select-value" {...props} />;
}

function SelectContent({
    className,
    position = "popper",
    children,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.SelectContent>) {
    return (
        <SelectPrimitive.SelectPortal>
            <SelectPrimitive.SelectContent
                data-slot="select-content"
                className={cn(
                    "relative z-50 max-h-48 min-w-32 overflow-hidden rounded-lg border border-border bg-popover text-sm text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
                    position === "popper" &&
                        "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
                    className,
                )}
                position={position}
                {...props}
            >
                <SelectPrimitive.SelectViewport
                    className={cn(
                        "p-1",
                        position === "popper" &&
                            "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
                    )}
                >
                    {children}
                </SelectPrimitive.SelectViewport>
            </SelectPrimitive.SelectContent>
        </SelectPrimitive.SelectPortal>
    );
}

function SelectItem({
    className,
    children,
    ...props
}: React.ComponentProps<typeof SelectPrimitive.SelectItem>) {
    return (
        <SelectPrimitive.SelectItem
            data-slot="select-item"
            className={cn(
                "relative flex w-full cursor-default select-none items-center rounded-md px-2 py-1.5 text-xs outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
                className,
            )}
            {...props}
        >
            <SelectPrimitive.SelectItemText>
                {children}
            </SelectPrimitive.SelectItemText>
        </SelectPrimitive.SelectItem>
    );
}

export { Select, SelectTrigger, SelectValue, SelectContent, SelectItem };
