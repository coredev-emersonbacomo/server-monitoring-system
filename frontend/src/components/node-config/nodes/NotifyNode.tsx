import { memo, useCallback, useId } from "react";
import { type NodeProps, Position, useReactFlow } from "@xyflow/react";
import { Mail, MessageCircle } from "lucide-react";
import { getInputType } from "./socketTypes";
import { NodeSocket } from "./node-socket";
import { SeverityNodeSocket } from "./SeverityNodeSocket";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { TemplateInput } from "./TemplateInput";
import { BaseNode } from "./BaseNode";

function EmailIcon({ size = 12 }: { size?: number }) {
    const id = useId().replace(/:/g, "");
    return (
        <Mail size={size} stroke={`url(#${id})`}>
            <defs>
                <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" style={{ stopColor: "var(--notify-email-1)" }} />
                    <stop offset="40%" style={{ stopColor: "var(--notify-email-2)" }} />
                    <stop offset="70%" style={{ stopColor: "var(--notify-email-3)" }} />
                    <stop offset="100%" style={{ stopColor: "var(--notify-email-4)" }} />
                </linearGradient>
            </defs>
        </Mail>
    );
}

const CHANNELS: Record<
    string,
    {
        icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
        label: string;
        color?: string;
    }
> = {
    email: { icon: EmailIcon, label: "Assigned SecOps Email" },
    discord: {
        icon: MessageCircle,
        label: "Discord",
        color: "var(--notify-discord)",
    },
};

export const NotifyNode = memo(({ id, data, type, selected }: NodeProps) => {
    const { updateNodeData } = useReactFlow();
    const channel = (data.channel as string) || "email";
    const ch = CHANNELS[channel] || CHANNELS.email;
    const Icon = ch.icon;

    const inDef = getInputType(type, "input");

    const handleChannelChange = useCallback(
        (v: string) => {
            updateNodeData(id, { channel: v });
        },
        [id, updateNodeData],
    );

    const handleSeverityChange = useCallback(
        (v: string) => {
            updateNodeData(id, { severity: v });
        },
        [id, updateNodeData],
    );

    const handleStringChange = useCallback(
        (key: string, v: string) => {
            updateNodeData(id, { [key]: v });
        },
        [id, updateNodeData],
    );

    const severity = (data.severity as string) || "warning";
    const subject = (data.subject as string) || "";
    const message = (data.message as string) || "";
    const botToken = (data.bot_token as string) || "";
    const channelId = (data.channel_id as string) || "";
    const roleId = (data.role_id as string) || "";

    return (
        <BaseNode width="w-[220px]" borderColor="#f87171" selected={selected}>
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b border-red-400/10">
                <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
                    <Icon
                        size={14}
                        style={ch.color ? { color: ch.color } : undefined}
                    />
                </div>
                <span className="text-xs font-semibold text-foreground">
                    Notify
                </span>
            </div>

            <div className="flex flex-col px-3 gap-1.5 py-3">
                <NodeSocket
                    type="target"
                    position={Position.Left}
                    id="input"
                    def={inDef}
                    label={inDef?.label || "Trigger"}
                />

                <SeverityNodeSocket
                    nodeType={type}
                    value={severity}
                    onChange={handleSeverityChange}
                />

                <Select value={channel} onValueChange={handleChannelChange}>
                    <SelectTrigger
                        className="h-7 text-xs font-semibold"
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                    >
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(CHANNELS).map(([val, c]) => {
                            const ItemIcon = c.icon;
                            return (
                                <SelectItem key={val} value={val}>
                            <span className="flex items-center gap-1.5">
                                <ItemIcon
                                    size={12}
                                    style={
                                        c.color ? { color: c.color } : undefined
                                    }
                                />
                                {c.label}
                            </span>
                                </SelectItem>
                            );
                        })}
                    </SelectContent>
                </Select>

                {channel === "email" && (
                    <TemplateInput
                        value={subject}
                        onChange={(v) => handleStringChange("subject", v)}
                        onClick={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        rows={2}
                        label="Subject"
                    />
                )}

                {channel === "discord" && (
                    <>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">
                                Bot Token
                            </span>
                            <input
                                type="password"
                                value={botToken}
                                onChange={(e) =>
                                    handleStringChange(
                                        "bot_token",
                                        e.target.value,
                                    )
                                }
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="flex-1 min-w-0 w-full text-xs text-foreground bg-background border border-input rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">
                                Channel
                            </span>
                            <input
                                type="text"
                                value={channelId}
                                onChange={(e) =>
                                    handleStringChange(
                                        "channel_id",
                                        e.target.value,
                                    )
                                }
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="flex-1 min-w-0 w-full text-xs text-foreground bg-background border border-input rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">
                                Role
                            </span>
                            <input
                                type="text"
                                value={roleId}
                                onChange={(e) =>
                                    handleStringChange(
                                        "role_id",
                                        e.target.value,
                                    )
                                }
                                onClick={(e) => e.stopPropagation()}
                                onPointerDown={(e) => e.stopPropagation()}
                                className="flex-1 min-w-0 w-full text-xs text-foreground bg-background border border-input rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                        </div>
                    </>
                )}

                <TemplateInput
                    value={message}
                    onChange={(v) => handleStringChange("message", v)}
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    channel={channel}
                    rows={2}
                    label="Message"
                />
            </div>
        </BaseNode>
    );
});
