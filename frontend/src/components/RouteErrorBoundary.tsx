import { useRouteError } from "react-router-dom";

export default function RouteErrorBoundary() {
    const error = useRouteError();
    const message = error instanceof Error ? error.message : String(error);

    return (
        <div className="flex items-center justify-center min-h-screen px-6">
            <div className="max-w-md w-full bg-card border border-border/60 rounded-xl p-6 shadow-sm flex flex-col gap-4 text-center">
                <p className="font-medium text-sm text-foreground">
                    This page failed to load
                </p>
                <p className="text-xs text-muted-foreground break-words">
                    {message}
                </p>
                <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="mx-auto px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
                >
                    Reload
                </button>
            </div>
        </div>
    );
}