import { memo, useCallback, useMemo, useState } from 'react';
import { type NodeProps, Position, useReactFlow, useStore } from '@xyflow/react';
import { Timer, Repeat, Clock } from 'lucide-react';
import { getInputType, getOutputType } from './socketTypes';
import { NodeSocket } from './node-socket';
import { DurationInput } from './DurationInput';
import { colonToSeconds, secondsToColon } from './duration-utils';

const TIME_CONFIGS: Record<string, { icon: React.ComponentType<{ size?: number }>; label: string; color: string }> = {
    check_after: { icon: Clock, label: 'Check After', color: '#10b981' },
    sustained: { icon: Timer, label: 'Sustained', color: '#10b981' },
    repeat: { icon: Repeat, label: 'Repeat', color: '#10b981' },
};

function hasAnyAncestor(nodeId: string, edges: any[]): boolean {
    return edges.some(e => e.target === nodeId);
}

function hasSustainedAncestor(nodeId: string, nodeLookup: Map<string, any>, edges: any[]): boolean {
    const visited = new Set<string>();
    const queue = [nodeId];

    while (queue.length > 0) {
        const current = queue.shift()!;
        if (visited.has(current)) continue;
        visited.add(current);

        const incomingEdges = edges.filter(e => e.target === current);
        for (const edge of incomingEdges) {
            const sourceNode = nodeLookup.get(edge.source);
            if (!sourceNode) continue;
            if (sourceNode.type === 'sustained') return true;
            queue.push(edge.source);
        }
    }

    return false;
}

function isValidMaxValue(v: string): boolean {
    if (v === 'inf') return true;
    const n = parseInt(v);
    return !isNaN(n) && n >= 0;
}

export const TimeNode = memo(({ id, data, type }: NodeProps) => {
    const { updateNodeData } = useReactFlow();
    const allNodes = useStore((s) => s.nodeLookup);
    const allEdges = useStore((s) => s.edgeLookup);
    const config = TIME_CONFIGS[type] || TIME_CONFIGS.check_after;
    const Icon = config.icon;
    const color = config.color;

    const isRepeat = type === 'repeat';

    const outDef = getOutputType(type);
    const inDef = getInputType(type, 'input');

    const durationColon = (data.duration as string) || '00:00:00:10:00';
    const intervalColon = (data.interval as string) || '00:00:00:10:00';
    const maxRepeatsRaw = (data.max_repeats as number | string) ?? 0;
    const isInfinite = maxRepeatsRaw === 0 || maxRepeatsRaw === 'inf';
    const savedMax = isInfinite ? 'inf' : String(maxRepeatsRaw);

    const [maxInputValue, setMaxInputValue] = useState(savedMax);
    const [maxHasError, setMaxHasError] = useState(false);

    const durationSeconds = useMemo(() => colonToSeconds(durationColon), [durationColon]);
    const intervalSeconds = useMemo(() => colonToSeconds(intervalColon), [intervalColon]);

    const isAncestorSustained = useMemo(
        () => isRepeat && hasSustainedAncestor(id, allNodes, Array.from(allEdges.values())),
        [isRepeat, id, allNodes, allEdges]
    );

    const isConnected = useMemo(
        () => isRepeat && hasAnyAncestor(id, Array.from(allEdges.values())),
        [isRepeat, id, allEdges]
    );

    const dynamicLabel = useMemo(() => {
        if (!isRepeat) return config.label;
        if (isAncestorSustained) return 'Repeat (Sustained)';
        if (isConnected) return 'Repeat (Check)';
        return 'Repeat';
    }, [isRepeat, isAncestorSustained, isConnected, config.label]);

    const handleDurationChange = useCallback((seconds: number) => {
        updateNodeData(id, { duration: secondsToColon(seconds) });
    }, [id, updateNodeData]);

    const handleIntervalChange = useCallback((seconds: number) => {
        updateNodeData(id, { interval: secondsToColon(seconds) });
    }, [id, updateNodeData]);

    const handleMaxBlur = useCallback(() => {
        const v = maxInputValue.trim();
        if (!isValidMaxValue(v)) {
            setMaxHasError(true);
            return;
        }
        setMaxHasError(false);
        if (v === 'inf') {
            updateNodeData(id, { max_repeats: 0 });
        } else {
            updateNodeData(id, { max_repeats: parseInt(v) });
        }
    }, [id, maxInputValue, updateNodeData]);

    const handleMaxKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    }, []);

    return (
        <div className="relative rounded-xl bg-card border-2 shadow-sm min-w-[220px]"
            style={{ borderColor: `${color}99` }}>
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b" style={{ borderColor: `${color}15` }}>
                <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                    <Icon size={14} />
                </div>
                <span className="text-sm font-semibold text-foreground">{dynamicLabel}</span>
            </div>

            <div className="flex">
                <NodeSocket type="target" position={Position.Left} id="input" def={inDef}
                    label={inDef?.label || 'In'} />
                <div className="flex-1" />
                <NodeSocket type="source" position={Position.Right} id="output" def={outDef}
                    label={outDef?.label || 'Out'} />
            </div>

            <div className="px-3 pb-2.5">
                {isRepeat ? (
                    <div className="flex flex-col gap-1.5 w-full">
                        <DurationInput
                            label="Every"
                            value={intervalSeconds}
                            onChange={handleIntervalChange}
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
                                className={`flex-1 text-xs font-mono text-foreground bg-background border rounded px-1.5 py-1 focus:outline-none focus:ring-1 ${
                                    maxHasError
                                        ? 'border-red-500 focus:ring-red-500/50'
                                        : 'border-input focus:ring-ring'
                                }`}
                            />
                            <span className="text-[10px] text-muted-foreground font-medium">runs</span>
                        </div>
                    </div>
                ) : (
                    <DurationInput
                        label="For"
                        value={durationSeconds}
                        onChange={handleDurationChange}
                    />
                )}
            </div>
        </div>
    );
});
