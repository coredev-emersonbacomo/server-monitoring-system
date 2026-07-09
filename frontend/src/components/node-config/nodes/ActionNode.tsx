import { memo, useCallback } from 'react';
import { type NodeProps, Position, useReactFlow } from '@xyflow/react';
import { Mail, MessageSquare, MessageCircle } from 'lucide-react';
import { getInputType } from './socketTypes';
import { SocketHandle } from './socket-components';

const CHANNELS: Record<string, { icon: React.ComponentType<{ size?: number }>; label: string }> = {
    email: { icon: Mail, label: 'Email' },
    sms: { icon: MessageSquare, label: 'SMS' },
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
    const webhookUrl = (data.webhook_url as string) || '';

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
                <select
                    value={channel}
                    onChange={(e) => handleChannelChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-xs font-semibold text-foreground bg-red-500/10 border border-red-400/30 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-red-400/50 cursor-pointer"
                >
                    {Object.entries(CHANNELS).map(([val, c]) => (
                        <option key={val} value={val}>{c.label}</option>
                    ))}
                </select>

                {channel === 'email' && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">Subj</span>
                        <input
                            type="text"
                            value={subject}
                            onChange={(e) => handleStringChange('subject', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 text-xs text-foreground bg-red-500/5 border border-red-400/20 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-red-400/50"
                        />
                    </div>
                )}
                {channel === 'discord' && (
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">URL</span>
                        <input
                            type="text"
                            value={webhookUrl}
                            onChange={(e) => handleStringChange('webhook_url', e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 text-xs text-foreground bg-red-500/5 border border-red-400/20 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-red-400/50"
                        />
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">Msg</span>
                    <input
                        type="text"
                        value={message}
                        onChange={(e) => handleStringChange('message', e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 text-xs text-foreground bg-red-500/5 border border-red-400/20 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-red-400/50"
                    />
                </div>
            </div>
        </div>
    );
});
