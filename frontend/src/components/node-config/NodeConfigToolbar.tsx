import { useState, useRef, useEffect } from "react";
import { Save, Eye, Loader2, X, Undo2, Redo2, ChevronDown } from "lucide-react";

interface NodeConfigToolbarProps {
    name: string;
    isSaving: boolean;
    isDirty: boolean;
    onNameChange?: (name: string) => void;
    onSave: () => void;
    onPreview: () => void;
    canUndo?: boolean;
    canRedo?: boolean;
    onUndo?: () => void;
    onRedo?: () => void;
    historyLabels?: string[];
    historyIndex?: number;
    onJumpToHistory?: (idx: number) => void;
    readOnly?: boolean;
    scopeLabel?: string;
    onClose?: () => void;
}

export function NodeConfigToolbar({
    name,
    isSaving,
    isDirty,
    onNameChange,
    onSave,
    onPreview,
    canUndo = false,
    canRedo = false,
    onUndo,
    onRedo,
    historyLabels = [],
    historyIndex = -1,
    onJumpToHistory,
    readOnly,
    scopeLabel,
    onClose,
}: NodeConfigToolbarProps) {
    const [actionsOpen, setActionsOpen] = useState(false);
    const actionsRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!actionsOpen) return;
        const onClick = (e: PointerEvent | MouseEvent) => {
            if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
                setActionsOpen(false);
            }
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setActionsOpen(false);
        };
        window.addEventListener("pointerdown", onClick, true);
        window.addEventListener("keydown", onKeyDown);
        return () => {
            window.removeEventListener("pointerdown", onClick, true);
            window.removeEventListener("keydown", onKeyDown);
        };
    }, [actionsOpen]);

    const currentLabel = historyLabels[historyIndex] || "Start";
    const hasHistory = historyLabels.length > 1;

    return (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border/40 bg-card">
            {readOnly ? (
                <div className="flex-1 flex items-center gap-2 px-1 py-1.5">
                    <span className="text-sm font-semibold text-foreground">
                        {name}
                    </span>
                    {scopeLabel && (
                        <span className="text-[10px] font-medium uppercase text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {scopeLabel}
                        </span>
                    )}
                </div>
            ) : (
                <input
                    type="text"
                    value={name}
                    onChange={(e) => onNameChange?.(e.target.value)}
                    placeholder="Config name..."
                    className="flex-1 px-3 py-1.5 text-sm font-semibold rounded-lg border border-border/60 bg-background
                        text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
            )}
            <div className="flex items-center gap-1.5">
                <div className="flex items-center border border-border/40 rounded-lg">
                    <button
                        onClick={onUndo}
                        disabled={!canUndo}
                        className="p-1.5 rounded-l-lg hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Undo (Ctrl+Z)"
                    >
                        <Undo2 size={14} className="text-muted-foreground" />
                    </button>
                    <div ref={actionsRef} className="relative">
                        <button
                            onClick={() => hasHistory && setActionsOpen(!actionsOpen)}
                            className={`flex items-center gap-0.5 px-1.5 py-1.5 text-[10px] font-medium border-x border-border/40 transition-colors ${
                                hasHistory
                                    ? 'hover:bg-accent text-muted-foreground cursor-pointer'
                                    : 'text-muted-foreground/40 cursor-default'
                            }`}
                            title="Action history"
                        >
                            <span className="max-w-[80px] truncate">{currentLabel}</span>
                            <ChevronDown size={10} />
                        </button>
                        {actionsOpen && hasHistory && (
                            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-52 max-h-56 overflow-y-auto bg-card border border-border/60 rounded-lg shadow-lg z-50 py-1">
                                {[...historyLabels].reverse().map((label, ri) => {
                                    const i = historyLabels.length - 1 - ri;
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => {
                                                onJumpToHistory?.(i);
                                                setActionsOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                                                i === historyIndex
                                                    ? 'bg-primary/10 text-primary font-medium'
                                                    : i < historyIndex
                                                        ? 'text-foreground hover:bg-accent'
                                                        : 'text-muted-foreground/50 hover:bg-accent'
                                            }`}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                                i === historyIndex
                                                    ? 'bg-primary'
                                                    : i < historyIndex
                                                        ? 'bg-muted-foreground/40'
                                                        : 'bg-muted-foreground/20'
                                            }`} />
                                            <span className="truncate">{label}</span>
                                            {i === historyIndex && (
                                                <span className="ml-auto text-[9px] text-primary/60">current</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onRedo}
                        disabled={!canRedo}
                        className="p-1.5 rounded-r-lg hover:bg-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Redo (Ctrl+Shift+Z)"
                    >
                        <Redo2 size={14} className="text-muted-foreground" />
                    </button>
                </div>
                <button
                    onClick={onPreview}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-accent transition-colors"
                    title="Preview compiled config"
                >
                    <Eye size={14} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                        Preview
                    </span>
                </button>
                <button
                    onClick={onSave}
                    disabled={isSaving || !isDirty}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground
                        hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {isSaving ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : (
                        <Save size={14} />
                    )}
                    <span>{isSaving ? "Saving..." : "Save"}</span>
                </button>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                        title="Close editor"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>
        </div>
    );
}
