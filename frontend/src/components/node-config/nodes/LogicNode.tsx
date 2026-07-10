import { memo, useCallback } from "react";
import { type NodeProps, Position, useReactFlow, useEdges } from "@xyflow/react";
import { Plus, GitBranch, Minus, type LucideIcon } from "lucide-react";
import { getInputType, getOutputType } from './socketTypes';
import { SocketHandle } from './socket-components';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const OPERATIONS: Record<string, { icon: LucideIcon; label: string }> = {
    and: { icon: Plus, label: "AND" },
    or: { icon: GitBranch, label: "OR" },
    not: { icon: Minus, label: "NOT" },
};

function useIsHandleConnected(nodeId: string, handleId: string): boolean {
    const edges = useEdges();
    return edges.some(e => e.target === nodeId && e.targetHandle === handleId);
}

export const LogicNode = memo(({ id, data, type }: NodeProps) => {
    const { updateNodeData } = useReactFlow();
    const operation = (data.operation as string) || "and";
    const op = OPERATIONS[operation] || OPERATIONS.and;
    const Icon = op.icon;
    const isNot = operation === "not";

    const outDef = getOutputType(type);
    const inDef = getInputType(type, 'input');

    const inputConnected = useIsHandleConnected(id, "input");

    const handleChange = useCallback(
        (v: string) => {
            updateNodeData(id, { operation: v });
        },
        [id, updateNodeData],
    );

    return (
        <div className="relative rounded-xl bg-card border-2 border-violet-400/60 shadow-sm min-w-[180px]">
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b border-violet-400/10">
                <div className="p-1.5 rounded-lg bg-violet-500/10">
                    <Icon size={14} className="text-violet-400" />
                </div>
                <Select value={operation} onValueChange={handleChange}>
                    <SelectTrigger className="flex-1 h-7 text-xs font-semibold" onClick={(e) => e.stopPropagation()}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(OPERATIONS).map(([val, o]) => (
                            <SelectItem key={val} value={val}>{o.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center pl-3 pr-3 py-2.5">
                <div className="relative flex items-center min-h-[24px] flex-1">
                    <SocketHandle type="target" position={Position.Left} id="input" def={inDef} />
                    <span className="text-[10px] font-medium uppercase text-muted-foreground ml-5 shrink-0">
                        {inDef?.label || 'Input'}{isNot ? '' : 's'}
                    </span>
                    {!inputConnected && (
                        <span className="text-[10px] text-muted-foreground/40 italic ml-1">
                            {isNot ? '(1)' : '(any)'}
                        </span>
                    )}
                </div>
                <div className="relative flex items-center min-h-[24px]">
                    <span className="text-[10px] font-medium text-muted-foreground mr-2">{outDef?.label || 'Result'}</span>
                    <SocketHandle type="source" position={Position.Right} id="output" def={outDef} />
                </div>
            </div>
        </div>
    );
});
