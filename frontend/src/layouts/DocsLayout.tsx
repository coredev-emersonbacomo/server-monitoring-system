import { Outlet } from "react-router-dom";
import { useJwtAuth } from "@/hooks/useJwtAuth";
import { TooltipProvider } from "@/components/ui/tooltip";

export function DocsLayout() {
    const { isLoading } = useJwtAuth();

    if (isLoading) {
        return <div className="flex min-h-screen items-center justify-center" />;
    }

    return (
        <TooltipProvider>
            <main className="flex-1 flex flex-col h-dvh overflow-hidden bg-background text-foreground">
                <Outlet />
            </main>
        </TooltipProvider>
    );
}