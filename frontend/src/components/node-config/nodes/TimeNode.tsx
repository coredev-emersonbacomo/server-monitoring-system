import { memo, useCallback } from 'react';
import { type NodeProps, Position, useReactFlow } from '@xyflow/react';
import { Timer, Repeat, Clock } from 'lucide-react';
import { getInputType, getOutputType } from './socketTypes';
import { SocketHandle } from './socket-components';

const TIME_CONFIGS: Record<string, { icon: React.ComponentType<{ size?: number }>; label: string; color: string }> = {
    delay: { icon: Clock, label: 'Delay', color: '#10b981' },
    sustained: { icon: Timer, label: 'Sustained', color: '#10b981' },
    repeat: { icon: Repeat, label: 'Repeat', color: '#10b981' },
};

export const TimeNode = memo(({ id, data, type }: NodeProps) => {
    const { updateNodeData } = useReactFlow();
    const config = TIME_CONFIGS[type] || TIME_CONFIGS.delay;
    const Icon = config.icon;
    const color = config.color;

    const isRepeat = type === 'repeat';

    const outDef = getOutputType(type);
    const inDef = getInputType(type, 'input');

    const duration = (data.duration as string) || '00:00:10:00:00';
    const interval = (data.interval as string) || '00:00:10:00:00';
    const maxRepeats = (data.max_repeats as number) ?? 0;

    const handleDurationChange = useCallback((v: string) => {
        updateNodeData(id, { duration: v });
    }, [id, updateNodeData]);

    const handleIntervalChange = useCallback((v: string) => {
        updateNodeData(id, { interval: v });
    }, [id, updateNodeData]);

    const handleMaxRepeatsChange = useCallback((v: string) => {
        updateNodeData(id, { max_repeats: parseInt(v) || 0 });
    }, [id, updateNodeData]);

    return (
        <div className="relative rounded-xl bg-card border-2 shadow-sm min-w-[220px]"
            style={{ borderColor: `${color}99` }}>
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b" style={{ borderColor: `${color}15` }}>
                <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                    <Icon size={14} />
                </div>
                <span className="text-sm font-semibold text-foreground">{config.label}</span>
            </div>

            <div className="relative flex items-center min-h-[28px] pl-3 pr-3 pt-1.5">
                <SocketHandle type="target" position={Position.Left} id="input" def={inDef} />
                <span className="text-[10px] font-medium uppercase text-muted-foreground ml-5 shrink-0">{inDef?.label || 'In'}</span>
            </div>

            {isRepeat ? (
                <div className="px-3 pb-2.5 flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 ml-5">
                        <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">Interval</span>
                        <input
                            type="text"
                            value={interval}
                            onChange={(e) => handleIntervalChange(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 text-xs font-mono text-foreground bg-emerald-500/5 border border-emerald-400/20 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                        />
                    </div>
                    <div className="flex items-center gap-2 ml-5">
                        <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">Max</span>
                        <input
                            type="number"
                            value={maxRepeats}
                            onChange={(e) => handleMaxRepeatsChange(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                            className="flex-1 text-xs font-mono text-foreground bg-emerald-500/5 border border-emerald-400/20 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                        />
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-2 pl-3 pr-3 pb-2.5 ml-5">
                    <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">Duration</span>
                    <input
                        type="text"
                        value={duration}
                        onChange={(e) => handleDurationChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 text-xs font-mono text-foreground bg-emerald-500/5 border border-emerald-400/20 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-emerald-400/50"
                    />
                </div>
            )}

            <div className="relative flex items-center justify-end min-h-[24px] pl-3 pr-3 pb-2.5">
                <span className="text-[10px] font-medium text-muted-foreground mr-2">{outDef?.label || 'Out'}</span>
                <SocketHandle type="source" position={Position.Right} id="output" def={outDef} />
            </div>
        </div>
    );
});
