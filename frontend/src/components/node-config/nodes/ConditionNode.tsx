import { memo, useCallback } from 'react';
import { type NodeProps, Position, useReactFlow, useEdges } from '@xyflow/react';
import { GitCompare } from 'lucide-react';
import { getInputType, getOutputType } from './socketTypes';
import { NodeSocket } from './node-socket';
import { useBlurNumber } from './useBlurNumber';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { BaseNode } from './BaseNode';

const OPERATORS: Record<string, string> = {
    greater_than: 'Greater Than',
    greater_than_equal: 'Greater Than or Equal',
    less_than: 'Less Than',
    less_than_equal: 'Less Than or Equal',
    equal: 'Equal',
    between: 'Between',
};

function useIsHandleConnected(nodeId: string, handleId: string): boolean {
    const edges = useEdges();
    return edges.some(e => e.target === nodeId && e.targetHandle === handleId);
}

function useMultiInputCount(nodeId: string, handleId: string): number {
    const edges = useEdges();
    return edges.filter(e => e.target === nodeId && e.targetHandle === handleId).length;
}

export const ConditionNode = memo(({ id, data, type, selected }: NodeProps) => {
    const { updateNodeData } = useReactFlow();
    const operator = (data.operator as string) || 'greater_than';
    const isBetween = operator === 'between';

    const outDef = getOutputType(type);
    const inputADef = getInputType(type, 'input-a');
    const inputBDef = getInputType(type, 'input-b');
    const inputMinDef = getInputType(type, 'input-min');
    const inputMaxDef = getInputType(type, 'input-max');

    const aConnected = useIsHandleConnected(id, 'input-a');
    const bConnected = useIsHandleConnected(id, 'input-b');
    const minConnected = useIsHandleConnected(id, 'input-min');
    const maxConnected = useIsHandleConnected(id, 'input-max');
    const aCount = useMultiInputCount(id, 'input-a');
    const bCount = useMultiInputCount(id, 'input-b');

    const handleOperatorChange = useCallback((v: string) => {
        updateNodeData(id, { operator: v });
    }, [id, updateNodeData]);

    const commit = useCallback((key: string, v: number) => {
        updateNodeData(id, { [key]: v });
    }, [id, updateNodeData]);

    const valueA = useBlurNumber((data.value_a as number) ?? 0, (v) => commit('value_a', v));
    const threshold = useBlurNumber((data.threshold as number) ?? 0, (v) => commit('threshold', v));
    const min = useBlurNumber((data.min as number) ?? 0, (v) => commit('min', v));
    const maxVal = useBlurNumber((data.max as number) ?? 0, (v) => commit('max', v));

    return (
        <BaseNode width="w-[220px]" borderColor="#fbbf24" selected={selected}>
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b border-amber-400/10">
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                    <GitCompare size={14} className="text-amber-400" />
                </div>
                <span className="text-xs font-semibold text-foreground">Compare</span>
                {aCount > 1 && (
                    <span className="ml-auto text-[10px] font-mono text-amber-400/70 bg-amber-500/10 px-1.5 py-0.5 rounded">
                        {aCount}× metrics
                    </span>
                )}
            </div>

            <div className="flex">
                <NodeSocket type="target" position={Position.Left} id="input-a" def={inputADef} elongated
                    label={`${inputADef?.label || 'A'}${aCount > 0 ? ` (${aCount})` : ''}`}>
                    {!aConnected && (
                        <input
                            type="number"
                            value={valueA.value}
                            onChange={valueA.onChange}
                            onBlur={valueA.onBlur}
                            onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
                            className="ml-1.5 mr-3 min-w-0 flex-1 text-xs font-mono text-foreground bg-background border border-border/60 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                    )}
                </NodeSocket>
                {aConnected && <div className="flex-1" />}
                <NodeSocket type="source" position={Position.Right} id="output" def={outDef}
                    label={outDef?.label || 'Result'} />
            </div>

            <div className="flex px-3 py-2">
                <Select value={operator} onValueChange={handleOperatorChange}>
                    <SelectTrigger className="flex-1 h-7 text-xs font-semibold" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(OPERATORS).map(([val, label]) => (
                            <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isBetween ? (
                <>
                    <div className="flex">
                        <NodeSocket type="target" position={Position.Left} id="input-min" def={inputMinDef}
                            label={inputMinDef?.label || 'Min'}>
                            {!minConnected && (
                                <input
                                    type="number"
                                    value={min.value}
                                    onChange={min.onChange}
                                    onBlur={min.onBlur}
                                    onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
                                    className="ml-2 mr-3 flex-1 text-xs font-mono text-foreground bg-background border border-border/60 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            )}
                        </NodeSocket>
                    </div>
                    <div className="flex">
                        <NodeSocket type="target" position={Position.Left} id="input-max" def={inputMaxDef}
                            label={inputMaxDef?.label || 'Max'}>
                            {!maxConnected && (
                                <input
                                    type="number"
                                    value={maxVal.value}
                                    onChange={maxVal.onChange}
                                    onBlur={maxVal.onBlur}
                                    onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
                                    className="ml-2 mr-3 flex-1 text-xs font-mono text-foreground bg-background border border-border/60 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                                />
                            )}
                        </NodeSocket>
                    </div>
                </>
            ) : (
                <div className="flex pb-2.5">
                    <NodeSocket type="target" position={Position.Left} id="input-b" def={inputBDef} elongated
                        label={`${inputBDef?.label || 'B'}${bCount > 0 ? ` (${bCount})` : ''}`}>
                        {!bConnected && (
                            <input
                                type="number"
                                value={threshold.value}
                                onChange={threshold.onChange}
                                onBlur={threshold.onBlur}
                                onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
                                className="ml-1.5 mr-3 min-w-0 flex-1 text-xs font-mono text-foreground bg-background border border-border/60 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                        )}
                    </NodeSocket>
                </div>
            )}
        </BaseNode>
    );
});
