export interface NodeConfigNode {
    id: string;
    type: string;
    settings: Record<string, unknown>;
    position: { x: number; y: number };
}

export interface NodeConfigEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
    targetHandle?: string;
}

export interface NodeConfigGraph {
    nodes: NodeConfigNode[];
    edges: NodeConfigEdge[];
}

export type AlertScope = 'global' | 'client' | 'server';

export interface NodeConfig {
    id: number;
    name: string;
    slug: string | null;
    description: string | null;
    config: NodeConfigGraph;
    compiled_config: { rules: unknown[] } | null;
    enabled: boolean;
    scope_type: AlertScope;
    scope_id: number | null;
    created_by: number | null;
    created_at: string;
    updated_at: string;
}

export interface NodeTypeDefinition {
    type: string;
    category: string;
    label: string;
    unlimitedInputs: boolean;
    settings: NodeSettingDefinition[];
}

export interface NodeSettingDefinition {
    key: string;
    label: string;
    type: string;
    required?: boolean;
    default?: unknown;
    options?: Record<string, string>;
    description?: string;
}

export type NodeCategory = 'metric' | 'condition' | 'logic' | 'time' | 'action';

export const NODE_CATEGORIES: { key: NodeCategory; label: string; color: string }[] = [
    { key: 'metric', label: 'Metrics', color: '#3b82f6' },
    { key: 'condition', label: 'Conditions', color: '#f59e0b' },
    { key: 'logic', label: 'Logic', color: '#8b5cf6' },
    { key: 'time', label: 'Time', color: '#10b981' },
    { key: 'action', label: 'Actions', color: '#ef4444' },
];
