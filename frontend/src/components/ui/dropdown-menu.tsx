import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"

import { cn } from "@/lib/utils"

function DropdownMenu({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.DropdownMenu>) {
  return <DropdownMenuPrimitive.DropdownMenu data-slot="dropdown-menu" {...props} />
}

function DropdownMenuTrigger({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.DropdownMenuTrigger>) {
  return (
    <DropdownMenuPrimitive.DropdownMenuTrigger
      data-slot="dropdown-trigger"
      className={className}
      {...props}
    />
  )
}

function DropdownMenuContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.DropdownMenuContent>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.DropdownMenuContent
        data-slot="dropdown-content"
        className={cn(
          "relative z-50 min-w-32 overflow-hidden rounded-lg border border-border bg-popover text-sm text-popover-foreground shadow-md data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.DropdownMenuGroup>) {
  return <DropdownMenuPrimitive.DropdownMenuGroup data-slot="dropdown-group" {...props} />
}

function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.DropdownMenuLabel>) {
  return (
    <DropdownMenuPrimitive.DropdownMenuLabel
      data-slot="dropdown-label"
      className={cn("px-2 py-1.5 text-xs font-semibold text-muted-foreground", className)}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.DropdownMenuSeparator>) {
  return (
    <DropdownMenuPrimitive.DropdownMenuSeparator
      data-slot="dropdown-separator"
      className={cn("mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.DropdownMenuItem>) {
  return (
    <DropdownMenuPrimitive.DropdownMenuItem
      data-slot="dropdown-item"
      className={cn(
        "relative flex cursor-default select-none items-center rounded-md px-2 py-1.5 text-xs outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground",
        className,
      )}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
}
