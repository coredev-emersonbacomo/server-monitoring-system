import { Label } from "@/components/ui/label";

interface FieldProps {
    label: string;
    required?: boolean;
    children: React.ReactNode;
    error?: string;
    isEdit?: boolean;
}

export default function Field({
    label,
    required,
    children,
    error,
    isEdit = true,
}: FieldProps) {
    return (
        <div className="flex flex-col gap-1">
            <Label>
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
