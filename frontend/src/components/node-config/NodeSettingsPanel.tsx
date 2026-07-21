import { useCallback, useMemo } from "react";
import type {
    NodeConfigNode,
    NodeTypeDefinition,
    NodeSettingDefinition,
} from "@/types/node-config";
import { X } from "lucide-react";

interface NodeSettingsPanelProps {
    node: NodeConfigNode | null;
    nodeTypeDef: NodeTypeDefinition | null;
    onUpdate: (id: string, settings: Record<string, unknown>) => void;
    onDelete: (id: string) => void;
    onClose: () => void;
}

export function NodeSettingsPanel({
    node,
    nodeTypeDef,
    onUpdate,
    onDelete,
    onClose,
}: NodeSettingsPanelProps) {
    const handleChange = useCallback(
        (key: string, value: unknown) => {
            if (!node) return;
            onUpdate(node.id, {
                ...((node.data as Record<string, unknown>) || {}),
                [key]: value,
            });
        },
        [node, onUpdate],
    );

    if (!node) {
        return null;
    }

    const settings = (node.data as Record<string, unknown>) || {};
    const channel = settings.channel as string | undefined;

    const settingDefs = useMemo(() => {
        const all = nodeTypeDef?.settings || [];
        if (nodeTypeDef?.type !== "notification") return all;
        const channelKey = channel || "email";

        const channelSettings: Record<string, string[]> = {
            email: ["channel", "subject", "message"],
            sms: ["channel", "message"],
            discord: [
                "channel",
                "bot_token",
                "channel_id",
                "role_id",
                "message",
            ],
        };
        const allowed = channelSettings[channelKey] || channelSettings.email;
        return all.filter((s) => allowed.includes(s.key));
    }, [nodeTypeDef, channel]);

    return (
        <div className="w-72 max-h-120 bg-card border border-border/40 ring-1 ring-foreground/30 rounded-lg shadow-lg overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border/40">
                <div>
                    <div className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        {nodeTypeDef?.category || "Node"}
                    </div>
                    <div className="text-sm font-semibold">
                        {nodeTypeDef?.label || node.type}
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1 hover:bg-accent rounded-md transition-colors"
                >
                    <X size={16} className="text-muted-foreground" />
                </button>
            </div>

            <div className="p-4 flex flex-col gap-4">
                {settingDefs.map((def) => (
                    <SettingField
                        key={def.key}
                        def={def}
                        value={settings[def.key] ?? def.default ?? ""}
                        onChange={(v) => handleChange(def.key, v)}
                    />
                ))}

                {settingDefs.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                        No settings available.
                    </p>
                )}
            </div>

            <div className="p-4 border-t border-border/40">
                <button
                    onClick={() => onDelete(node.id)}
                    className="w-full px-3 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                    Delete Node
                </button>
            </div>
        </div>
    );
}

interface SettingFieldProps {
    def: NodeSettingDefinition;
    value: unknown;
    onChange: (value: unknown) => void;
}

function SettingField({ def, value, onChange }: SettingFieldProps) {
    const id = `setting-${def.key}`;

    if (def.type === "select" && def.options) {
        return (
            <div className="flex flex-col gap-1.5">
                <label
                    htmlFor={id}
                    className="text-xs font-medium text-muted-foreground"
                >
                    {def.label}
                    {def.required && (
                        <span className="text-red-400 ml-0.5">*</span>
                    )}
                </label>
                <select
                    id={id}
                    value={String(value)}
                    onChange={(e) => onChange(e.target.value)}
                    className="px-2.5 py-1.5 text-sm rounded-lg border border-border/60 bg-background text-foreground
                        focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                    {Object.entries(def.options).map(([optValue, optLabel]) => (
                        <option key={optValue} value={optValue}>
                            {optLabel}
                        </option>
                    ))}
                </select>
            </div>
        );
    }

    if (def.type === "textarea") {
        return (
            <div className="flex flex-col gap-1.5">
                <label
                    htmlFor={id}
                    className="text-xs font-medium text-muted-foreground"
                >
                    {def.label}
                    {def.required && (
                        <span className="text-red-400 ml-0.5">*</span>
                    )}
                </label>
                <textarea
                    id={id}
                    value={String(value)}
                    onChange={(e) => onChange(e.target.value)}
                    rows={3}
                    className="px-2.5 py-1.5 text-sm rounded-lg border border-border/60 bg-background text-foreground
                        focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    placeholder={def.description || ""}
                />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-1.5">
            <label
                htmlFor={id}
                className="text-xs font-medium text-muted-foreground"
            >
                {def.label}
                {def.required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            <input
                id={id}
                type={def.type === "number" ? "number" : "text"}
                value={String(value)}
                onChange={(e) =>
                    onChange(
                        def.type === "number"
                            ? parseFloat(e.target.value) || 0
                            : e.target.value,
                    )
                }
                className="px-2.5 py-1.5 text-sm rounded-lg border border-border/60 bg-background text-foreground
                    focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder={def.description || ""}
            />
        </div>
    );
}
