import { memo, useCallback } from 'react';
import { type NodeProps, Position, useReactFlow } from '@xyflow/react';
import { Mail, MessageSquare, MessageCircle } from 'lucide-react';
import { getInputType, getOutputType } from './socketTypes';
import { NodeSocket } from './node-socket';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { TemplateInput } from './TemplateInput';
import { BaseNode } from './BaseNode';

const CHANNELS: Record<string, { icon: React.ComponentType<{ size?: number }>; label: string }> = {
    email: { icon: Mail, label: 'User Email' },
    sms: { icon: MessageSquare, label: 'User SMS' },
    discord: { icon: MessageCircle, label: 'Discord' },
};

export const ActionNode = memo(({ id, data, type, selected }: NodeProps) => {
    const { updateNodeData } = useReactFlow();
    const channel = (data.channel as string) || 'email';
    const ch = CHANNELS[channel] || CHANNELS.email;
    const Icon = ch.icon;

    const inDef = getInputType(type, 'input');
    const outDef = getOutputType(type);

    const handleChannelChange = useCallback((v: string) => {
        updateNodeData(id, { channel: v });
    }, [id, updateNodeData]);

    const handleStringChange = useCallback((key: string, v: string) => {
        updateNodeData(id, { [key]: v });
    }, [id, updateNodeData]);

    const subject = (data.subject as string) || '';
    const message = (data.message as string) || '';
    const botToken = (data.bot_token as string) || '';
    const channelId = (data.channel_id as string) || '';
    const roleId = (data.role_id as string) || '';

    return (
        <BaseNode width="w-[220px]" borderColor="#f87171" selected={selected}>
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b border-red-400/10">
                <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
                    <Icon size={14} />
                </div>
                <span className="text-xs font-semibold text-foreground">Notify</span>
            </div>

            <div className="flex">
                <NodeSocket type="target" position={Position.Left} id="input" def={inDef}
                    label={inDef?.label || 'Trigger'} />
                <div className="flex-1" />
                <NodeSocket type="source" position={Position.Right} id="output" def={outDef}
                    label={outDef?.label || 'Out'} />
            </div>

            <div className="flex px-3 pb-2.5">
                <div className="flex flex-col gap-1.5 w-full">
                    <Select value={channel} onValueChange={handleChannelChange}>
                        <SelectTrigger className="h-7 text-xs font-semibold" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {Object.entries(CHANNELS).map(([val, c]) => (
                                <SelectItem key={val} value={val}>{c.label}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {channel === 'email' && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">Subj</span>
                            <TemplateInput
                                value={subject}
                                onChange={(v) => handleStringChange('subject', v)}
                                onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
                                className="flex-1 text-xs text-foreground bg-background border border-input rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                        </div>
                    )}

                    {channel === 'discord' && (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">Token</span>
                                <input
                                    type="password"
                                    value={botToken}
                                    onChange={(e) => handleStringChange('bot_token', e.target.value)}
                                    onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
                                    className="flex-1 min-w-0 w-full text-xs text-foreground bg-background border border-input rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">Channel</span>
                                <TemplateInput
                                    value={channelId}
                                    onChange={(v) => handleStringChange('channel_id', v)}
                                    onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
                                    className="flex-1 text-xs text-foreground bg-background border border-input rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">Role</span>
                                <TemplateInput
                                    value={roleId}
                                    onChange={(v) => handleStringChange('role_id', v)}
                                    onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
                                    className="flex-1 text-xs text-foreground bg-background border border-input rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            </div>
                        </>
                    )}

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">Msg</span>
                        <TemplateInput
                            value={message}
                            onChange={(v) => handleStringChange('message', v)}
                            onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
                            className="flex-1 text-xs text-foreground bg-background border border-input rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                    </div>
                </div>
            </div>
        </BaseNode>
    );
});
