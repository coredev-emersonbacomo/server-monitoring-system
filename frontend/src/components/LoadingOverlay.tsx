import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
    visible: boolean;
    progress?: number;
    message?: string;
}

export function LoadingOverlay({ visible, progress, message }: LoadingOverlayProps) {
    if (!visible) return null;

    const hasProgress = progress !== undefined && progress >= 0;

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-card border border-border/60 rounded-xl shadow-lg p-8 flex flex-col items-center gap-4 min-w-[280px]">
                {hasProgress ? (
                    <div className="w-full flex flex-col gap-2">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{message ?? "Uploading..."}</span>
                            <span className="font-mono text-foreground">{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                        {message && (
                            <p className="text-sm text-muted-foreground">{message}</p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
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
