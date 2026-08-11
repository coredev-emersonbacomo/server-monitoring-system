import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Node } from "@xyflow/react";
import type {
    NodeTypeDefinition,
    NodeSettingDefinition,
} from "@/types/node-config";
import { X, Puzzle, Maximize2 } from "lucide-react";
import { DurationInput } from "./nodes/DurationInput";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
} from "@/components/ui/select";
import { useTemplateAutocomplete } from "./useTemplateAutocomplete";
import { TemplateDropdown } from "./template-dropdown";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface NodeSettingsPanelProps {
    node: Node | null;
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
            onUpdate(node.id, {
                ...((node.data as Record<string, unknown>) || {}),
                [key]: value,
            });
        },
        [node, onUpdate],
    );

    const settings = node ? ((node.data as Record<string, unknown>) || {}) : {};
    const channel = settings.channel as string | undefined;
    const repeatIntervalMs =
        parseInt((settings.repeat_interval as string) || "0", 10) || 0;
    const hasRepeat = repeatIntervalMs > 0;

    const settingDefs = useMemo(() => {
        const all = nodeTypeDef?.settings || [];
        let filtered = all;
        if (nodeTypeDef?.type === "notification") {
            const channelKey = channel || "email";
            const channelSettings: Record<string, string[]> = {
                email: ["channel", "severity", "subject", "message"],
                sms: ["channel", "severity", "message"],
                discord: [
                    "channel",
                    "severity",
                    "bot_token",
                    "channel_id",
                    "role_id",
                    "message",
                ],
            };
            const allowed =
                channelSettings[channelKey] || channelSettings.email;
            filtered = all.filter((s) => allowed.includes(s.key));
        }
        if (hasRepeat) {
            filtered = filtered.filter(
                (s) =>
                    s.key !== "repeat_interval" &&
                    s.key !== "repeat_max_repeats",
            );
        }
        return filtered;
    }, [nodeTypeDef, channel, hasRepeat]);

    if (!node) {
        return null;
    }

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
                {settingDefs.map((def) =>
                    def.key === "message" || def.key === "subject" ? (
                        <MessageField
                            key={def.key}
                            def={def}
                            value={settings[def.key] ?? def.default ?? ""}
                            onChange={(v) => handleChange(def.key, v)}
                        />
                    ) : (
                        <SettingField
                            key={def.key}
                            def={def}
                            value={settings[def.key] ?? def.default ?? ""}
                            onChange={(v) => handleChange(def.key, v)}
                        />
                    ),
                )}

                {settingDefs.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                        No settings available.
                    </p>
                )}

                {hasRepeat && (
                    <>
                        <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                            <Puzzle
                                size={10}
                                className="text-muted-foreground"
                            />
                            <span className="text-[10px] font-medium uppercase text-muted-foreground/60">
                                Capabilities
                            </span>
                        </div>
                        <div className="flex flex-col gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Puzzle
                                        size={12}
                                        className="text-primary"
                                    />
                                    <span className="text-xs font-medium text-primary">
                                        Repeat
                                    </span>
                                </div>
                                <button
                                    onClick={() =>
                                        onUpdate(node.id, {
                                            ...settings,
                                            repeat_interval: "",
                                            repeat_max_repeats: -1,
                                        })
                                    }
                                    className="text-[10px] text-muted-foreground hover:text-red-400 transition-colors"
                                >
                                    Remove
                                </button>
                            </div>
                            <DurationInput
                                label="Interval"
                                value={repeatIntervalMs}
                                onChange={(ms) =>
                                    onUpdate(node.id, {
                                        ...settings,
                                        repeat_interval: String(ms),
                                    })
                                }
                            />
                            <RepeatMaxField
                                value={
                                    (settings.repeat_max_repeats as number) ??
                                    -1
                                }
                                onChange={(v) =>
                                    onUpdate(node.id, {
                                        ...settings,
                                        repeat_max_repeats: v,
                                    })
                                }
                            />
                        </div>
                    </>
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

function RepeatMaxField({
    value,
    onChange,
}: {
    value: number;
    onChange: (v: number) => void;
}) {
    const isInfinite =
        value === -1 || value === 0 || (value as unknown) === "inf";
    const [inputValue, setInputValue] = useState(
        isInfinite ? "inf" : String(value),
    );
    const [hasError, setHasError] = useState(false);

    useEffect(() => {
        const inf = value === -1 || value === 0 || (value as unknown) === "inf";
        setInputValue(inf ? "inf" : String(value));
    }, [value]);

    const commit = () => {
        const v = inputValue.trim();
        if (v === "inf" || v === "-1") {
            setHasError(false);
            onChange(-1);
            setInputValue("inf");
        } else {
            const n = parseInt(v);
            if (isNaN(n) || n < 1) {
                setHasError(true);
                return;
            }
            setHasError(false);
            onChange(n);
            setInputValue(String(n));
        }
    };

    return (
        <div className="flex items-center gap-2">
            <span className="text-[10px] font-medium uppercase text-muted-foreground shrink-0">
                Max runs
            </span>
            <input
                type="text"
                value={inputValue}
                onChange={(e) => {
                    setInputValue(e.target.value);
                    if (hasError) setHasError(false);
                }}
                onBlur={commit}
                onKeyDown={(e) => {
                    if (e.key === "Enter")
                        (e.target as HTMLInputElement).blur();
                }}
                className={`flex-1 min-w-0 text-xs font-mono text-foreground bg-background border rounded px-1.5 py-1 focus:outline-none focus:ring-1 ${
                    hasError
                        ? "border-red-500 focus:ring-red-500/50"
                        : "border-input focus:ring-ring"
                }`}
            />
            <span className="text-[10px] text-muted-foreground font-medium">
                inf = endless
            </span>
        </div>
    );
}

interface SettingFieldProps {
    def: NodeSettingDefinition;
    value: unknown;
    onChange: (value: unknown) => void;
}

function MessageField({ def, value, onChange, rows = 2 }: SettingFieldProps & { rows?: number }) {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <label
                    htmlFor={`setting-${def.key}`}
                    className="text-xs font-medium text-muted-foreground"
                >
                    {def.label}
                    {def.required && (
                        <span className="text-red-400 ml-0.5">*</span>
                    )}
                </label>
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        setOpen(true);
                    }}
                    className="p-1 hover:bg-accent rounded-md transition-colors"
                    title="Expand message editor"
                >
                    <Maximize2
                        size={12}
                        className="text-muted-foreground"
                    />
                </button>
            </div>
            <AutoSizeTextarea
                id={`setting-${def.key}`}
                value={String(value)}
                onChange={(v) => onChange(v)}
                placeholder={def.description || ""}
                rows={rows}
            />
            <MessageDialog
                open={open}
                onOpenChange={setOpen}
                value={String(value)}
                onChange={(v) => onChange(v)}
                title={`${def.label} Template`}
            />
        </div>
    );
}

function MessageDialog({
    open,
    onOpenChange,
    value,
    onChange,
    title,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    value: string;
    onChange: (value: string) => void;
    title?: string;
}) {
    const ref = useRef<HTMLTextAreaElement>(null);
    const [local, setLocal] = useState(value);
    useEffect(() => {
        if (value !== local) setLocal(value);
    }, [value, local]);

    const ac = useTemplateAutocomplete(
        local,
        (v) => {
            onChange(v);
            setLocal(v);
        },
        ref,
    );

    useEffect(() => {
        if (open && ref.current) {
            requestAnimationFrame(() => ref.current?.focus());
        }
    }, [open]);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            onChange(e.target.value);
            setLocal(e.target.value);
            ac.handleChange(e);
        },
        [ac, onChange],
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{title ?? "Message Template"}</DialogTitle>
                </DialogHeader>
                <div className="relative">
                    <textarea
                        ref={ref}
                        value={local}
                        onChange={handleChange}
                        onKeyDown={ac.handleKeyDown}
                        onFocus={(e) => ac.handleFocus(e.currentTarget)}
                        onBlur={() => setTimeout(() => ac.close(), 50)}
                        onClick={(e) => ac.handleClick(e.currentTarget)}
                        rows={16}
                        className="w-full h-[50vh] p-3 text-xs font-mono text-foreground bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                    {ac.showDropdown && (
                        <TemplateDropdown
                            filtered={ac.filtered}
                            selectedIndex={ac.selectedIndex}
                            query={ac.query}
                            caret={ac.caret}
                            onSelect={ac.insertVariable}
                            onHover={ac.setSelectedIndex}
                            onClose={ac.close}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function autoResize(textarea: HTMLTextAreaElement) {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
}

function AutoSizeTextarea({
    id,
    value,
    onChange,
    placeholder,
    className,
    rows = 1,
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    rows?: number;
}) {
    const ref = useRef<HTMLTextAreaElement>(null);
    const [local, setLocal] = useState(value);
    useEffect(() => {
        if (value !== local) setLocal(value);
    }, [value, local]);

    const ac = useTemplateAutocomplete(
        local,
        (v) => {
            onChange(v);
            setLocal(v);
        },
        ref,
    );

    useEffect(() => {
        if (ref.current) autoResize(ref.current);
    }, [value]);

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            onChange(e.target.value);
            setLocal(e.target.value);
            ac.handleChange(e);
            autoResize(e.target);
        },
        [ac, onChange],
    );

    return (
        <div className="relative">
            <textarea
                ref={ref}
                id={id}
                value={local}
                onChange={handleChange}
                onKeyDown={ac.handleKeyDown}
                onFocus={(e) => ac.handleFocus(e.currentTarget)}
                onBlur={() => setTimeout(() => ac.close(), 50)}
                onClick={(e) => ac.handleClick(e.currentTarget)}
                rows={rows}
                className={
                    className ??
                    "w-full px-2.5 py-1.5 text-sm rounded-lg border border-border/60 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none overflow-hidden"
                }
                placeholder={placeholder}
            />
            {ac.showDropdown && (
                <TemplateDropdown
                    filtered={ac.filtered}
                    selectedIndex={ac.selectedIndex}
                    query={ac.query}
                    caret={ac.caret}
                    onSelect={ac.insertVariable}
                    onHover={ac.setSelectedIndex}
                    onClose={ac.close}
                />
            )}
        </div>
    );
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
                 <Select value={String(value)} onValueChange={(v) => onChange(v)}>
                      <SelectTrigger
                          id={id}
                          className="w-full px-2.5 py-1.5 text-sm rounded-lg border border-border/60 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                      >
                          <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                          {Object.entries(def.options).map(([optValue, optLabel]) => (
                              <SelectItem key={optValue} value={optValue}>
                                  {optLabel}
                              </SelectItem>
                          ))}
                      </SelectContent>
                  </Select>
             </div>
        );
    }

    const placeholder = def.placeholder ?? def.description ?? "";

    // Single-line text fields (e.g. template key/value)
    if (def.type === "text") {
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
                    type="text"
                    value={String(value)}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full text-xs font-mono text-foreground bg-background border border-input rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring"
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
            <AutoSizeTextarea
                id={id}
                value={String(value)}
                onChange={(v) =>
                    onChange(def.type === "number" ? parseFloat(v) || 0 : v)
                }
                placeholder={placeholder}
            />
        </div>
    );
}
