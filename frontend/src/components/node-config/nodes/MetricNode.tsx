import { memo, useCallback } from 'react';
import { type NodeProps, Position, useReactFlow } from '@xyflow/react';
import { Activity, MemoryStick, HardDrive, Network, Server, Heart } from 'lucide-react';
import { NodeSocket } from './node-socket';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const METRICS: Record<string, { icon: React.ComponentType<{ size?: number }>; label: string }> = {
    cpu_usage: { icon: Activity, label: 'CPU Usage' },
    memory_usage: { icon: MemoryStick, label: 'Memory Usage' },
    disk_usage: { icon: HardDrive, label: 'Disk Usage' },
    network_usage: { icon: Network, label: 'Network Usage' },
    server_status: { icon: Server, label: 'Server Status' },
    heartbeat_age: { icon: Heart, label: 'Heartbeat Age' },
};

const COLOR = '#3b82f6';

export const MetricNode = memo(({ id, data }: NodeProps) => {
    const { updateNodeData } = useReactFlow();
    const metricType = (data.metric_type as string) || 'cpu_usage';
    const metric = METRICS[metricType] || METRICS.cpu_usage;
    const Icon = metric.icon;
    const isMultiOutput = metricType === 'server_status';

    const handleChange = useCallback(
        (v: string) => {
            updateNodeData(id, { metric_type: v });
        },
        [id, updateNodeData],
    );

    return (
        <div className="relative rounded-xl bg-card border-2 shadow-sm min-w-[200px]"
            style={{ borderColor: COLOR }}>
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b" style={{ borderColor: `${COLOR}15` }}>
                <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${COLOR}20`, color: COLOR }}>
                    <Icon size={14} />
                </div>
                <span className="text-xs font-semibold text-foreground">Metric</span>
            </div>

            <div className="flex px-3 py-2">
                <Select value={metricType} onValueChange={handleChange}>
                    <SelectTrigger className="flex-1 h-7 text-xs font-semibold" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(METRICS).map(([val, m]) => (
                            <SelectItem key={val} value={val}>{m.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isMultiOutput ? (
                <>
                    <div className="flex pb-1">
                        <div className="flex-1" />
                        <NodeSocket type="source" position={Position.Right} id="online"
                            def={{ type: 'boolean', label: 'Online' }} label="Online" labelColor="#6ee7b7" />
                    </div>
                    <div className="flex pb-2.5">
                        <div className="flex-1" />
                        <NodeSocket type="source" position={Position.Right} id="offline"
                            def={{ type: 'boolean', label: 'Offline' }} label="Offline" labelColor="#c48888" />
                    </div>
                </>
            ) : (
                <div className="flex pb-2.5">
                    <div className="flex-1" />
                    <NodeSocket type="source" position={Position.Right} id="output"
                        def={{ type: 'number', label: 'Value' }} label="Value" />
                </div>
            )}
        </div>
    );
});
