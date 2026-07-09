import { Play, Save, RotateCw, ToggleLeft, ToggleRight, Loader2 } from 'lucide-react';

interface NodeConfigToolbarProps {
    name: string;
    enabled: boolean;
    isSaving: boolean;
    onNameChange: (name: string) => void;
    onSave: () => void;
    onToggle: () => void;
    onTest: () => void;
    onReset: () => void;
}

export function NodeConfigToolbar({
    name, enabled, isSaving, onNameChange, onSave, onToggle, onTest, onReset,
}: NodeConfigToolbarProps) {
    return (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border/40 bg-card">
            <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="Config name..."
                className="flex-1 px-3 py-1.5 text-sm font-semibold rounded-lg border border-border/60 bg-background
                    text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex items-center gap-1.5">
                <button
                    onClick={onToggle}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-accent transition-colors"
                    title={enabled ? 'Disable config' : 'Enable config'}
                >
                    {enabled ? <ToggleRight size={16} className="text-emerald-400" /> : <ToggleLeft size={16} className="text-muted-foreground" />}
                    <span className="text-xs text-muted-foreground">{enabled ? 'Enabled' : 'Disabled'}</span>
                </button>
                <button
                    onClick={onReset}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-accent transition-colors"
                    title="Reset node state"
                >
                    <RotateCw size={14} className="text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Reset</span>
                </button>
                <button
                    onClick={onTest}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg hover:bg-accent transition-colors"
                    title="Test config"
                >
                    <Play size={14} className="text-amber-400" />
                    <span className="text-xs text-muted-foreground">Test</span>
                </button>
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground
                        hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                    {isSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                    <span>{isSaving ? 'Saving...' : 'Save'}</span>
                </button>
            </div>
        </div>
    );
}
