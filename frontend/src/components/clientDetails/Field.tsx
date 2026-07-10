import { Label } from "@/components/ui/label";
import type { LucideIcon } from "lucide-react";

interface FieldProps {
    label: string;
    icon?: LucideIcon;
    required?: boolean;
    children: React.ReactNode;
    error?: string;
    isEdit?: boolean;
}

export default function Field({
    label,
    icon: Icon,
    required,
    children,
    error,
    isEdit = true,
}: FieldProps) {
    return (
        <div className="flex flex-col">
            <Label className="flex items-center gap-1.5 text-muted-foreground">
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {label}
                {required && isEdit && (
                    <span className="text-destructive ml-0.5">*</span>
                )}
            </Label>
            {children}  
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}