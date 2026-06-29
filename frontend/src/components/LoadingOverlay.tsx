import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
    visible: boolean;
    progress?: number;
    message?: string;
}

export function LoadingOverlay({ visible }: LoadingOverlayProps) {
    if (!visible) return null;

    return <div className="fixed inset-0 z-50 bg-background/30" />;
}

export function SavingButton({
    saving,
    progress,
    children,
    className,
    ...props
}: {
    saving: boolean;
    progress?: number;
    children: React.ReactNode;
    className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <button
            disabled={saving}
            className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none h-9 px-4 py-2",
                saving
                    ? "bg-primary/50 text-primary-foreground/70 cursor-not-allowed"
                    : "bg-primary text-primary-foreground hover:bg-primary/90",
                className,
            )}
            {...props}
        >
            {saving ? (
                <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {progress !== undefined && progress >= 0
                        ? `Uploading ${progress}%`
                        : "Saving..."}
                </>
            ) : (
                children
            )}
        </button>
    );
}
