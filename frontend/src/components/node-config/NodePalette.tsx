import { useCallback, type DragEvent } from 'react';
import type { NodeTypeDefinition, NodeCategory } from '@/types/node-config';
import { NODE_CATEGORIES } from '@/types/node-config';
import { cn } from '@/lib/utils';
import {
    Activity, MemoryStick, HardDrive, Network, Server, Heart,
    GitCompare, GitBranch, Clock, Timer, Repeat, Mail,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
    metric: Activity,
    condition: GitCompare,
    logic: GitBranch,
    time: Clock,
    action: Mail,
};

interface NodePaletteProps {
    nodeTypes: NodeTypeDefinition[];
    onAddNode: (type: string) => void;
}

export function NodePalette({ nodeTypes, onAddNode }: NodePaletteProps) {
    const grouped = nodeTypes.reduce<Record<string, NodeTypeDefinition[]>>((acc, nt) => {
        if (!acc[nt.category]) acc[nt.category] = [];
        acc[nt.category].push(nt);
        return acc;
    }, {});

    const onDragStart = useCallback((event: DragEvent, type: string) => {
        event.dataTransfer.setData('application/reactflow', type);
        event.dataTransfer.effectAllowed = 'move';
    }, []);

    return (
        <div className="w-full bg-card border-r border-border/40 overflow-y-auto p-3 flex flex-col gap-4">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">
                Node Types
            </div>
            {NODE_CATEGORIES.map((cat) => {
                const items = grouped[cat.key] || [];
                if (items.length === 0) return null;
                const CatIcon = CATEGORY_ICONS[cat.key];

                return (
                    <div key={cat.key}>
                        <div className="flex items-center gap-1.5 px-2 py-1 mb-1">
                            {CatIcon && <CatIcon size={12} className="text-muted-foreground" />}
                            <span className="text-[10px] font-medium uppercase text-muted-foreground/60">
                                {cat.label}
                            </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            {items.map((nt) => (
                                <button
                                    key={nt.type}
                                    draggable
                                    onDragStart={(e) => onDragStart(e, nt.type)}
                                    onClick={() => onAddNode(nt.type)}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left
                                        hover:bg-accent hover:text-accent-foreground transition-colors cursor-grab active:cursor-grabbing"
                                >
                                    <div
                                        className="p-1 rounded"
                                        style={{ backgroundColor: `${cat.color}15` }}
                                    >
                                        {CatIcon && <CatIcon size={14} style={{ color: cat.color }} />}
                                    </div>
                                    <span className="text-foreground/80">{nt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export function getNodeDefaults(type: string, definitions: NodeTypeDefinition[]): Record<string, unknown> {
    const def = definitions.find((d) => d.type === type);
    if (!def) return { label: type };
    const settings: Record<string, unknown> = { label: def.label };
    for (const setting of def.settings) {
        if (setting.default !== undefined) {
            settings[setting.key] = setting.default;
        }
    }
    return settings;
}
