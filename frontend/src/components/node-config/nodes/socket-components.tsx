import { type HandleTypeDef, TYPE_COLORS } from './socketTypes';
import { Handle, Position, type HandleType } from '@xyflow/react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SocketHandleProps {
    type: HandleType;
    position: Position;
    id: string;
    def?: HandleTypeDef;
    color?: string;
    elongated?: boolean;
}

export function SocketHandle({ type, position, id, def, color, elongated }: SocketHandleProps) {
    const bg = color ?? (def ? TYPE_COLORS[def.type] : '#9ca3af');

    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Handle
                    type={type}
                    position={position}
                    id={id}
                    className={elongated
                        ? "!w-3 !h-6 !border-2 !border-card !rounded-md"
                        : "!w-3 !h-3 !border-2 !border-card"
                    }
                    style={{ backgroundColor: bg }}
                />
            </TooltipTrigger>
            <TooltipContent side="top" className="font-mono text-[10px]">
                <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: bg }} />
                    <span className="font-semibold">{def?.label ?? id}</span>
                    <span className="text-muted-foreground">—</span>
                    <span>{def?.type ?? 'unknown'}</span>
                    {elongated && <span className="text-muted-foreground">· multi</span>}
                </div>
            </TooltipContent>
        </Tooltip>
    );
}
