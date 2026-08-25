import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { parseDuration, formatDuration } from './duration-utils';

interface DurationInputProps {
    label: string;
    value: number;
    onChange: (milliseconds: number) => void;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    error?: string;
}

const TOOLTIP_CONTENT = `Duration Format

Examples:
30      = 30 seconds
5m      = 5 minutes
1h30m   = 1 hour 30 minutes
2d6h    = 2 days 6 hours
1w2d    = 1 week 2 days
1y      = 1 year

Supported units:
s = seconds
m = minutes
h = hours
d = days
w = weeks
mo = months (30 days)
y = years (365 days)

Numbers without a unit default to seconds.
Spaces are optional.`;

export const DurationInput = memo(function DurationInput({
    label,
    value,
    onChange,
    placeholder = '0s',
    disabled = false,
    required = false,
    error: externalError,
}: DurationInputProps) {
    const [displayValue, setDisplayValue] = useState(() => formatDuration(value));
    const [parseError, setParseError] = useState<string | null>(null);
    const [isFocused, setIsFocused] = useState(false);
    const previousValue = useRef(displayValue);

    useEffect(() => {
        if (!isFocused) {
            setDisplayValue(formatDuration(value));
        }
    }, [value, isFocused]);

    const commitValue = useCallback(() => {
        const result = parseDuration(displayValue);

        if (!result.valid) {
            setParseError(result.error || 'Invalid duration');
            return;
        }

        setParseError(null);
        previousValue.current = formatDuration(result.milliseconds);
        onChange(result.milliseconds);
        setDisplayValue(formatDuration(result.milliseconds));
    }, [displayValue, onChange]);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
        commitValue();
    }, [commitValue]);

    const handleFocus = useCallback(() => {
        setIsFocused(true);
        previousValue.current = displayValue;
    }, [displayValue]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            commitValue();
            (e.target as HTMLInputElement).blur();
        }

        if (e.key === 'Escape') {
            setDisplayValue(previousValue.current);
            setParseError(null);
            (e.target as HTMLInputElement).blur();
        }
    }, [commitValue]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setDisplayValue(val);
        const result = parseDuration(val);
        if (result.valid) {
            setParseError(null);
            previousValue.current = formatDuration(result.milliseconds);
            onChange(result.milliseconds);
        }
    }, [onChange]);

    const hasError = !!externalError || !!parseError;
    const errorMessage = externalError || parseError;

    return (
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                    {label}
                    {required && <span className="text-destructive ml-0.5">*</span>}
                </label>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                                tabIndex={-1}
                            >
                                <HelpCircle size={12} />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs whitespace-pre-line text-[11px] leading-relaxed">
                            {TOOLTIP_CONTENT}
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <Input
                type="text"
                value={displayValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                className={`h-7 text-xs font-mono ${hasError ? 'border-destructive/50 focus-visible:ring-destructive/50' : ''}`}
            />
            {hasError && (
                <p className="text-[10px] text-destructive">{errorMessage}</p>
            )}
        </div>
    );
});
