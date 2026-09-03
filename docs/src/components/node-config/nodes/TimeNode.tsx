import { memo, useCallback, useState } from 'react';
import { Handle, type NodeProps, Position, useReactFlow } from '@xyflow/react';
import { Timer, Clock, Repeat } from 'lucide-react';
import { getInputType, getOutputType } from './socketTypes';
import { NodeSocket } from './node-socket';
import { DurationInput } from './DurationInput';
import { BaseNode } from './BaseNode';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const TIME_CONFIGS: Record<string, { icon: React.ComponentType<{ size?: number }>; label: string; color: string }> = {
    check_after: { icon: Clock, label: 'Check After', color: '#10b981' },
    sustained: { icon: Timer, label: 'Sustained', color: '#10b981' },
};

function isValidMaxValue(v: string): boolean {
    if (v === 'inf' || v === '-1') return true;
    const n = parseInt(v);
    return !isNaN(n) && n >= 0;
}

export const TimeNode = memo(({ id, data, type, selected }: NodeProps) => {
    const { updateNodeData } = useReactFlow();
    const config = TIME_CONFIGS[type] || TIME_CONFIGS.check_after;
    const Icon = config.icon;
    const color = config.color;

    const outDef = getOutputType(type);
    const inDef = getInputType(type, 'input');

    const durationMs = parseInt((data.duration as string) || '0', 10) || 0;
    const repeatIntervalMs = parseInt((data.repeat_interval as string) || '0', 10) || 0;
    const hasRepeat = repeatIntervalMs > 0;
    const repeatMaxRepeatsRaw = (data.repeat_max_repeats as number | string) ?? -1;
    const isInfinite = repeatMaxRepeatsRaw === -1 || repeatMaxRepeatsRaw === 0 || repeatMaxRepeatsRaw === 'inf';
    const savedMax = isInfinite ? 'inf' : String(repeatMaxRepeatsRaw);

    const [maxInputValue, setMaxInputValue] = useState(savedMax);
    const [maxHasError, setMaxHasError] = useState(false);

    const handleDurationChange = useCallback((ms: number) => {
        updateNodeData(id, { duration: String(ms) });
    }, [id, updateNodeData]);

    const handleRepeatIntervalChange = useCallback((ms: number) => {
        updateNodeData(id, { repeat_interval: String(ms) });
    }, [id, updateNodeData]);

    const handleMaxBlur = useCallback(() => {
        const v = maxInputValue.trim();
        if (!isValidMaxValue(v)) {
            setMaxHasError(true);
            return;
        }
        setMaxHasError(false);
        if (v === 'inf' || v === '-1') {
            setMaxInputValue('inf');
            updateNodeData(id, { repeat_max_repeats: -1 });
        } else {
            updateNodeData(id, { repeat_max_repeats: parseInt(v) });
        }
    }, [id, maxInputValue, updateNodeData]);

    const handleMaxKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    }, []);

    const isSustained = type === 'sustained';

    return (
        <BaseNode width="w-[220px]" borderColor={`${color}99`} selected={selected}>
            {isSustained && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Handle
                            type="target"
                            position={Position.Top}
                            id="chain-in"
                            className="w-3! h-3! border-2! border-card!"
                            style={{ backgroundColor: '#06b6d4' }}
                        />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="font-mono text-[10px]">
                        <span>Chain In</span>
                    </TooltipContent>
                </Tooltip>
            )}

            <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b" style={{ borderColor: `${color}15` }}>
                <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                    <Icon size={14} />
                </div>
                <span className="text-sm font-semibold text-foreground">{config.label}</span>
                {hasRepeat && (
                    <div className="p-1 rounded-lg shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                        <Repeat size={10} />
                    </div>
                )}
            </div>

            <div className="flex flex-col px-3 gap-1.5 py-3">
                <div className="flex items-center w-full">
                    <NodeSocket type="target" position={Position.Left} id="input" def={inDef}
                        label={inDef?.label || 'In'} />
                    <div className="flex-1" />
                    <NodeSocket type="source" position={Position.Right} id="output" def={outDef}
                        label={outDef?.label || 'Out'} />
                </div>

                <DurationInput
                    label="For"
                    value={durationMs}
                    onChange={handleDurationChange}
                />
                {hasRepeat && (
                    <>
                        <DurationInput
                            label="Repeats after"
                            value={repeatIntervalMs}
                            onChange={handleRepeatIntervalChange}
                        />
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">Max</span>
                            <input
                                type="text"
                                value={maxInputValue}
                                onChange={(e) => {
                                    setMaxInputValue(e.target.value);
                                    if (maxHasError) setMaxHasError(false);
                                }}
                                onBlur={handleMaxBlur}
                                onKeyDown={handleMaxKeyDown}
                                onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
                                className={`flex-1 min-w-0 w-full text-xs font-mono text-foreground bg-background border rounded px-1.5 py-1 focus:outline-none focus:ring-1 ${
                                    maxHasError
                                        ? 'border-red-500 focus:ring-red-500/50'
                                        : 'border-input focus:ring-ring'
                                }`}
                            />
                            <span className="text-[10px] text-muted-foreground font-medium">runs</span>
                        </div>
                    </>
                )}
            </div>

            {isSustained && (
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Handle
                            type="source"
                            position={Position.Bottom}
                            id="chain-out"
                            className="w-3! h-3! border-2! border-card!"
                            style={{ backgroundColor: '#06b6d4' }}
                        />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="font-mono text-[10px]">
                        <span>Chain Out</span>
                    </TooltipContent>
                </Tooltip>
            )}
        </BaseNode>
    );
});
