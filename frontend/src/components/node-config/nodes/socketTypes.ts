export type SocketDataType = 'number' | 'boolean' | 'any' | 'event';

export interface HandleTypeDef {
    type: SocketDataType;
    label: string;
}

export const TYPE_COLORS: Record<SocketDataType, string> = {
    number: '#60a5fa',
    boolean: '#34d399',
    any: '#9ca3af',
    event: '#f59e0b',
};

export const OUTPUT_TYPES: Record<string, HandleTypeDef> = {
    metric: { type: 'number', label: 'Value' },
    condition: { type: 'boolean', label: 'Result' },
    logic: { type: 'boolean', label: 'Result' },
    check_after: { type: 'boolean', label: 'Out' },
    sustained: { type: 'boolean', label: 'Out' },
    repeat: { type: 'boolean', label: 'Out' },
    notification: { type: 'event', label: 'Out' },
};

export const INPUT_TYPES: Record<string, Record<string, HandleTypeDef>> = {
    condition: {
        'input-a': { type: 'number', label: 'A' },
        'input-b': { type: 'number', label: 'B' },
        'input-min': { type: 'number', label: 'Min' },
        'input-max': { type: 'number', label: 'Max' },
    },
    logic: {
        input: { type: 'boolean', label: 'Input' },
    },
    check_after: {
        input: { type: 'any', label: 'In' },
    },
    sustained: {
        input: { type: 'any', label: 'In' },
    },
    repeat: {
        input: { type: 'event', label: 'In' },
    },
    notification: {
        input: { type: 'boolean', label: 'Trigger' },
    },
};

export function getInputType(nodeType: string, handleId: string): HandleTypeDef | undefined {
    return INPUT_TYPES[nodeType]?.[handleId];
}

export function getOutputType(nodeType: string, handleId?: string): HandleTypeDef | undefined {
    if (nodeType === 'metric' && handleId && (handleId === 'online' || handleId === 'offline')) {
        return { type: 'boolean', label: handleId === 'online' ? 'Online' : 'Offline' };
    }
    return OUTPUT_TYPES[nodeType];
}
