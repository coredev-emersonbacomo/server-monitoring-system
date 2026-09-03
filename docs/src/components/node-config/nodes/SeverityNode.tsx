import { memo, useCallback } from "react";
import { type NodeProps, Position, useReactFlow } from "@xyflow/react";
import { AlertTriangle } from "lucide-react";
import { getInputType, getOutputType } from './socketTypes';
import { NodeSocket } from './node-socket';
import { SeverityNodeSocket } from './SeverityNodeSocket';
import { BaseNode } from './BaseNode';

const SEVERITIES: Record<string, { label: string; color: string; bg: string; border: string }> = {
    notice:   { label: 'Notice',   color: '#fde047', bg: 'bg-yellow-300/10', border: 'border-yellow-200/10' },
    warning:  { label: 'Warning',  color: '#fb923c', bg: 'bg-orange-400/10', border: 'border-orange-300/10' },
    critical: { label: 'Critical', color: '#ef4444', bg: 'bg-red-500/10', border: 'border-red-400/10' },
};

export const SeverityNode = memo(({ id, data, type, selected }: NodeProps) => {
    const { updateNodeData } = useReactFlow();
    const severity = (data.severity as string) || 'warning';
    const s = SEVERITIES[severity] || SEVERITIES.warning;

    const outDef = getOutputType(type);
    const inDef = getInputType(type, 'input');

    const handleChange = useCallback(
        (v: string) => {
            updateNodeData(id, { severity: v });
        },
        [id, updateNodeData],
    );

    return (
        <BaseNode width="w-[180px]" borderColor={s.color} selected={selected}>
            <div className={"flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b " + s.border}>
                <div className={"p-1.5 rounded-lg " + s.bg}>
                    <AlertTriangle size={14} style={{ color: s.color }} />
                </div>
                <span className="text-xs font-semibold text-foreground">Severity</span>
            </div>

            <div className="flex flex-col px-3 gap-1.5 py-3">
                <div className="flex w-full">
                    <NodeSocket type="target" position={Position.Left} id="input" def={inDef}
                        label={inDef?.label || 'In'} />
                    <div className="flex-1" />
                    <NodeSocket type="source" position={Position.Right} id="output" def={outDef}
                        label={outDef?.label || 'Severity'} />
                </div>

                <SeverityNodeSocket nodeType={type} value={severity} onChange={handleChange} inputSocket={false} />
            </div>
        </BaseNode>
    );
});
