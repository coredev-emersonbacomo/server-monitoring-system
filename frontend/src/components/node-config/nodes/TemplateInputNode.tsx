import { memo, useCallback } from 'react';
import { type NodeProps, Position, useReactFlow } from '@xyflow/react';
import { Variable } from 'lucide-react';
import { NodeSocket } from './node-socket';
import { getOutputType } from './socketTypes';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { BaseNode } from './BaseNode';

const DATA_TYPES = [
    { value: 'number', label: 'Number' },
    { value: 'string', label: 'String' },
    { value: 'boolean', label: 'Boolean' },
] as const;

const COLOR = '#a78bfa';

export const TemplateInputNode = memo(({ id, data, type, selected }: NodeProps) => {
    const { updateNodeData } = useReactFlow();
    const templateId = (data.template_id as string) ?? '';
    const value = (data.value as string) ?? '';
    const dataType = ((data.data_type as string) ?? 'number') as 'number' | 'string' | 'boolean';

    const handleIdChange = useCallback(
        (v: string) => updateNodeData(id, { template_id: v.trim() }),
        [id, updateNodeData],
    );

    const handleValueChange = useCallback(
        (v: string) => updateNodeData(id, { value: v }),
        [id, updateNodeData],
    );

    const handleDataTypeChange = useCallback(
        (v: string) => updateNodeData(id, { data_type: v }),
        [id, updateNodeData],
    );

    const outDef = getOutputType(type, 'output', data as Record<string, unknown>);

    return (
        <BaseNode width="w-[200px]" borderColor={COLOR} selected={selected}>
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b" style={{ borderColor: `${COLOR}15` }}>
                <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${COLOR}20`, color: COLOR }}>
                    <Variable size={14} />
                </div>
                <span className="text-xs font-semibold text-foreground">Template</span>
            </div>

            {/* Value output socket, right aligned, directly under the header (matches other nodes) */}
            <div className="flex justify-end px-2 py-1 border-b" style={{ borderColor: `${COLOR}15` }}>
                <NodeSocket type="source" position={Position.Right} id="output"
                    def={outDef ?? { type: 'number', label: 'Value' }} label="Value" />
            </div>

            {/* Data type directly below the output socket */}
            <div className="px-2 py-1.5 border-b" style={{ borderColor: `${COLOR}15` }}>
                <Select value={dataType} onValueChange={handleDataTypeChange}>
                    <SelectTrigger className="h-7 text-xs" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {DATA_TYPES.map((d) => (
                            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Key input */}
            <div className="flex flex-col px-3 gap-2 py-3">
                <div className="flex items-end gap-1">
                    <div className="flex-1">
                        <label className="block text-[10px] font-medium uppercase text-muted-foreground mb-0.5">Key</label>
                        <input
                            type="text"
                            value={templateId}
                            onChange={(e) => handleIdChange(e.target.value)}
                            onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
                            placeholder="port_ping_slow_threshold_ms"
                            className="w-full text-xs font-mono text-foreground bg-background border border-input rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                        />
                    </div>
                </div>

                {/* Value input (the bottom value text input) */}
                <div className="flex-1">
                    <label className="block text-[10px] font-medium uppercase text-muted-foreground mb-0.5">Value</label>
                    <input
                        type="text"
                        value={value}
                        onChange={(e) => handleValueChange(e.target.value)}
                        onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}
                        placeholder="200"
                        className="w-full text-xs font-mono text-foreground bg-background border border-input rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                </div>
            </div>
        </BaseNode>
    );
});
