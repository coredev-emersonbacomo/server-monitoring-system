import { memo, useCallback } from 'react';
import { type NodeProps, Position, useReactFlow } from '@xyflow/react';
import { Activity, MemoryStick, HardDrive, Network, Server, Heart } from 'lucide-react';
import { getOutputType } from './socketTypes';
import { SocketHandle } from './socket-components';

const METRICS: Record<string, { icon: React.ComponentType<{ size?: number }>; color: string; label: string }> = {
    cpu_usage: { icon: Activity, color: '#3b82f6', label: 'CPU Usage' },
    memory_usage: { icon: MemoryStick, color: '#10b981', label: 'Memory Usage' },
    disk_usage: { icon: HardDrive, color: '#f59e0b', label: 'Disk Usage' },
    network_usage: { icon: Network, color: '#f43f5e', label: 'Network Usage' },
    server_status: { icon: Server, color: '#8b5cf6', label: 'Server Status' },
    heartbeat_age: { icon: Heart, color: '#ec4899', label: 'Heartbeat Age' },
};

export const MetricNode = memo(({ id, data, type }: NodeProps) => {
    const { updateNodeData } = useReactFlow();
    const metricType = (data.metric_type as string) || 'cpu_usage';
    const metric = METRICS[metricType] || METRICS.cpu_usage;
    const Icon = metric.icon;
    const color = metric.color;

    const outDef = getOutputType(type);

    const handleChange = useCallback(
        (v: string) => {
            updateNodeData(id, { metric_type: v });
        },
        [id, updateNodeData],
    );

    return (
        <div className="relative rounded-xl bg-card border-2 shadow-sm min-w-[200px]"
            style={{ borderColor: color }}>
            <div className="flex items-center gap-2 px-3 pt-2.5 pb-1.5 border-b" style={{ borderColor: `${color}15` }}>
                <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                    <Icon size={14} />
                </div>
                <span className="text-xs font-semibold text-foreground">Metric</span>
            </div>
            <div className="px-3 py-2">
                <select
                    value={metricType}
                    onChange={(e) => handleChange(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full text-sm font-semibold text-foreground bg-transparent border border-border/40 rounded px-2 py-1 focus:outline-none focus:ring-1 cursor-pointer"
                    style={{ color }}
                >
                    {Object.entries(METRICS).map(([val, m]) => (
                        <option key={val} value={val}>{m.label}</option>
                    ))}
                </select>
            </div>
            <div className="relative flex items-center justify-end min-h-[24px] pl-3 pr-3 pb-2.5">
                <span className="text-[10px] font-medium text-muted-foreground mr-2">{outDef?.label || 'Value'}</span>
                <SocketHandle type="source" position={Position.Right} id="output" def={outDef} />
            </div>
        </div>
    );
});
