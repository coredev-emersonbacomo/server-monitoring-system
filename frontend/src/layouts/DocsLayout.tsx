import { Outlet } from "react-router-dom";
import { useJwtAuth } from "@/hooks/useJwtAuth";
import { useOutletLayout } from "@/hooks/useOutletLayout";
import { SidebarNav } from "@/components/SidebarNav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { sidebarLinks } from "./ProtectedRoute";

export function DocsLayout() {
    const { user, isLoading } = useJwtAuth();
    const { isFullScreen, isSidebarCollapsed } = useOutletLayout();

    if (isLoading) {
        return <div className="flex min-h-screen items-center justify-center" />;
    }

    const sidebarMargin = isSidebarCollapsed
        ? "var(--sidebar-width-collapsed)"
        : "var(--sidebar-width)";

    return (
        <TooltipProvider>
            <div className={isFullScreen ? "flex h-screen" : "flex"}>
                {user && <SidebarNav links={sidebarLinks} />}
                <main
                    style={{ marginLeft: user ? sidebarMargin : undefined }}
                    className="flex-1 flex flex-col px-8 py-8 sm:px-10 lg:px-12 gap-5 min-h-screen bg-background text-foreground"
                >
                    <Outlet />
                </main>
            </div>
        </TooltipProvider>
    );
}
