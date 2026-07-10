import { memo, useCallback } from 'react';
import { type NodeProps, Position, useReactFlow } from '@xyflow/react';
import { Mail, MessageSquare, MessageCircle } from 'lucide-react';
import { getInputType } from './socketTypes';
import { SocketHandle } from './socket-components';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { TemplateInput } from './TemplateInput';

const CHANNELS: Record<string, { icon: React.ComponentType<{ size?: number }>; label: string }> = {
    email: { icon: Mail, label: 'User Email' },
    sms: { icon: MessageSquare, label: 'User SMS' },
    discord: { icon: MessageCircle, label: 'Discord' },
};

export const ActionNode = memo(({ id, data, type }: NodeProps) => {
    const { updateNodeData } = useReactFlow();
    const channel = (data.channel as string) || 'email';
    const ch = CHANNELS[channel] || CHANNELS.email;
    const Icon = ch.icon;

    const inDef = getInputType(type, 'input');

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
        <div className="relative rounded-xl bg-card border-2 border-red-400/60 shadow-sm min-w-[220px]">
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b border-red-400/10">
                <div className="p-1.5 rounded-lg bg-red-500/10 text-red-400">
                    <Icon size={14} />
                </div>
                <span className="text-xs font-semibold text-foreground">Notify</span>
            </div>

            <div className="relative flex items-center min-h-[28px] pl-3 pr-3 pt-1.5">
                <SocketHandle type="target" position={Position.Left} id="input" def={inDef} />
                <span className="text-[10px] font-medium uppercase text-muted-foreground ml-5 shrink-0">{inDef?.label || 'Trigger'}</span>
            </div>

            <div className="px-3 pb-2.5 flex flex-col gap-1.5 mt-1">
                <Select value={channel} onValueChange={handleChannelChange}>
                    <SelectTrigger className="h-7 text-xs font-semibold" onClick={(e) => e.stopPropagation()}>
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
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 text-xs text-foreground bg-red-500/5 border border-red-400/20 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-red-400/50"
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
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 text-xs text-foreground bg-red-500/5 border border-red-400/20 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-red-400/50"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">Channel</span>
                            <TemplateInput
                                value={channelId}
                                onChange={(v) => handleStringChange('channel_id', v)}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 text-xs text-foreground bg-red-500/5 border border-red-400/20 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-red-400/50"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">Role</span>
                            <TemplateInput
                                value={roleId}
                                onChange={(v) => handleStringChange('role_id', v)}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 text-xs text-foreground bg-red-500/5 border border-red-400/20 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-red-400/50"
                            />
                        </div>
                    </>
                )}

                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">Msg</span>
                    <TemplateInput
                        value={message}
                        onChange={(v) => handleStringChange('message', v)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 text-xs text-foreground bg-red-500/5 border border-red-400/20 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-red-400/50"
                    />
                </div>
            </div>
        </div>
    );
});
