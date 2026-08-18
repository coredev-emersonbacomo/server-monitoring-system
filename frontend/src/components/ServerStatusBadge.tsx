import { cn } from "@/lib/utils";
import { STATUS_CONFIG, resolveServerStatusKey } from "@/constants/serverStatus";

export function ServerStatusBadge({
    status,
    record_status,
    agent_deleted,
    size = "md",
    className,
}: {
    status?: string | null;
    record_status?: string | null;
    agent_deleted?: boolean;
    size?: "sm" | "md";
    className?: string;
}) {
    const key = resolveServerStatusKey(status, record_status, agent_deleted);
    const { label, icon: Icon, color, bg } = STATUS_CONFIG[key];
    const isSm = size === "sm";
    return (
        <span
            className={cn(
                "inline-flex items-center rounded-full border font-medium",
                bg,
                color,
                isSm
                    ? "gap-1 px-2 py-0.5 text-[10px]"
                    : "gap-2 px-3 py-1 text-sm",
                className,
            )}
        >
            <Icon size={isSm ? 10 : 14} />
            {label}
        </span>
    );
}