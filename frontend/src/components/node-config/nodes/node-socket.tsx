import { Handle, type HandleType, type Position } from "@xyflow/react";
import { type HandleTypeDef, TYPE_COLORS } from './socketTypes';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface NodeSocketProps {
  type: HandleType;
  position: Position;
  id: string;
  def?: HandleTypeDef;
  color?: string;
  elongated?: boolean;
  label?: string;
  labelColor?: string;
  children?: React.ReactNode;
  className?: string;
}

export function NodeSocket({ type, position, id, def, color, elongated, label, labelColor, children, className }: NodeSocketProps) {
  const bg = color ?? (def ? TYPE_COLORS[def.type] : '#9ca3af');
  const isInput = type === 'target';
  const labelStyle = labelColor ? { color: labelColor } : undefined;

  return (
    <div className={`flex items-center min-h-[28px] ${isInput ? '' : 'justify-end'} ${children ? 'flex-1 min-w-0' : ''} ${className || ''}`}>
      <span className={`relative flex items-center ${children ? 'flex-1 min-w-0' : ''}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Handle
              type={type}
              position={position}
              id={id}
              className={elongated
                ? "w-3! h-6! border-2! border-card! rounded-md!"
                : "w-3! h-3! border-2! border-card!"
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

        {isInput ? (
          <>
            {label && (
              <span className="ml-3 text-[10px] font-medium uppercase text-muted-foreground shrink-0" style={labelStyle}>{label}</span>
            )}
            {children}
          </>
        ) : (
          <>
            {children}
            {label && (
              <span className="text-[10px] font-medium text-muted-foreground shrink-0 mr-3" style={labelStyle}>{label}</span>
            )}
          </>
        )}
      </span>
    </div>
  );
}
