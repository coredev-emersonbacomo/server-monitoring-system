import { Label } from "@/components/ui/label";

export function Field({
    label,
    required,
    children,
    error,
    hint,
    isEdit = true,
}: {
    label: string;
    required?: boolean;
    children: React.ReactNode;
    error?: string;
    hint?: string;
    isEdit?: boolean;
}) {
    return (
        <div className="flex flex-col gap-1">
            <Label className="text-muted-foreground font-normal">
                {label}
                {required && isEdit && (
                    <span className="text-destructive ml-0.5">*</span>
                )}
            </Label>
            {children}
            {hint && (
                <p className="text-[11px] text-muted-foreground">{hint}</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export function SectionHeader({
    title,
    description,
}: {
    title: string;
    description?: string;
}) {
    return (
        <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            {description && (
                <p className="text-xs text-muted-foreground mt-0.5">
                    {description}
                </p>
            )}
        </div>
    );
}

export function FormSkeleton() {
    return (
        <div className="bg-card border border-border/60 rounded-xl shadow-sm p-6 sm:p-8 flex flex-col gap-6 animate-pulse">
            <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-muted shrink-0" />
                <div className="space-y-2 flex-1">
                    <div className="h-5 w-40 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                </div>
            </div>
            <div className="h-px bg-border" />
            {[0, 1, 2].map((i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <div className="h-3 w-16 bg-muted rounded" />
                        <div className="h-9 bg-muted rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <div className="h-3 w-16 bg-muted rounded" />
                        <div className="h-9 bg-muted rounded-md" />
                    </div>
                </div>
            ))}
            <div className="h-px bg-border" />
            <div className="flex justify-end">
                <div className="h-9 w-28 bg-muted rounded-md" />
            </div>
        </div>
    );
}
