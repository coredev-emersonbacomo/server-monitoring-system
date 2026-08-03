import { useState, useEffect, useRef, useCallback } from 'react';
import { Maximize2 } from 'lucide-react';
import { useTemplateAutocomplete } from '../useTemplateAutocomplete';
import { TemplateDropdown } from '../template-dropdown';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';

interface TemplateInputProps {
    value: string;
    onChange: (value: string) => void;
    onKeyDown?: (e: React.KeyboardEvent) => void;
    onClick?: (e: React.MouseEvent) => void;
    onPointerDown?: (e: React.PointerEvent) => void;
    className?: string;
    channel?: string;
    rows?: number;
    label?: string;
}

function autoResize(textarea: HTMLTextAreaElement) {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
}

export function TemplateInput({ value, onChange, onKeyDown, onClick, onPointerDown, className, rows, label }: TemplateInputProps) {
    const [local, setLocal] = useState(value);
    useEffect(() => {
        if (value !== local) setLocal(value);
    }, [value, local]);

    const [modalOpen, setModalOpen] = useState(false);

    const fieldRef = useRef<HTMLTextAreaElement | null>(null);
    const modalRef = useRef<HTMLTextAreaElement | null>(null);
    const ac = useTemplateAutocomplete(
        local,
        (v) => {
            onChange(v);
            setLocal(v);
        },
        fieldRef,
        onKeyDown,
    );

    const acModal = useTemplateAutocomplete(
        local,
        (v) => {
            onChange(v);
            setLocal(v);
        },
        modalRef,
        onKeyDown,
    );

    const handleChange = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            onChange(e.target.value);
            setLocal(e.target.value);
            ac.handleChange(e);
            if (!rows) autoResize(e.target);
        },
        [ac, onChange, rows],
    );

    const handleChangeModal = useCallback(
        (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            onChange(e.target.value);
            setLocal(e.target.value);
            acModal.handleChange(e);
        },
        [acModal, onChange],
    );

    const handleFocus = useCallback(
        (e: React.FocusEvent<HTMLTextAreaElement>) => {
            ac.handleFocus(e.currentTarget);
        },
        [ac],
    );

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLTextAreaElement>) => {
            ac.handleClick(e.currentTarget);
            onClick?.(e as unknown as React.MouseEvent);
        },
        [ac, onClick],
    );

    const handleMaximize = () => {
        setModalOpen(true);
        requestAnimationFrame(() => modalRef.current?.focus());
    };

    return (
        <>
            <div className={`relative flex flex-col gap-1 ${className || ''}`}>
                {label && (
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-medium uppercase text-muted-foreground">
                            {label}
                        </span>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleMaximize();
                            }}
                            className="p-0.5 hover:bg-accent rounded transition-colors"
                            title={`Expand ${label?.toLowerCase()} editor`}
                        >
                            <Maximize2 size={10} className="text-muted-foreground" />
                        </button>
                    </div>
                )}
                <textarea
                    ref={fieldRef}
                    value={local}
                    onChange={handleChange}
                    onKeyDown={ac.handleKeyDown}
                    onFocus={handleFocus}
                    onBlur={() => setTimeout(() => ac.close(), 50)}
                    onClick={handleClick}
                    onPointerDown={onPointerDown}
                    rows={rows ?? 2}
                    className={
                        `w-full resize-none overflow-hidden text-xs text-foreground bg-background border border-input rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-ring`
                    }
                    placeholder={label ? `${label} template` : "Message template"}
                    spellCheck={false}
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
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{label ? `${label} Template` : "Message Template"}</DialogTitle>
                    </DialogHeader>
                    <div className="relative">
                        <textarea
                            ref={modalRef}
                            value={local}
                            onChange={handleChangeModal}
                            onKeyDown={acModal.handleKeyDown}
                            onFocus={(e) => acModal.handleFocus(e.currentTarget)}
                            onBlur={() => setTimeout(() => acModal.close(), 50)}
                            onClick={(e) => acModal.handleClick(e.currentTarget)}
                            rows={16}
                            className="w-full h-[50vh] p-3 text-xs font-mono text-foreground bg-background border border-border/60 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                            placeholder={label ? `${label} template` : "Message template"}
                            spellCheck={false}
                        />
                        {acModal.showDropdown && (
                            <TemplateDropdown
                                filtered={acModal.filtered}
                                selectedIndex={acModal.selectedIndex}
                                query={acModal.query}
                                caret={acModal.caret}
                                onSelect={acModal.insertVariable}
                                onHover={acModal.setSelectedIndex}
                                onClose={acModal.close}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}