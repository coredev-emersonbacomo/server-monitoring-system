import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
    Activity,
    Settings,
    Users,
    Landmark,
    type LucideProps,
    Server,
    ScrollText,
} from "lucide-react";
import { SidebarNav, type SidebarNavLink } from "@/components/SidebarNav";
import { BreadcrumbProvider } from "@/contexts/BreadCrumbContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import TopBarNav from "@/components/TopBarNav";
import { useJwtAuth } from "@/hooks/useJwtAuth";
import { Toaster } from "sonner";
import { useOutletLayout } from "@/hooks/useOutletLayout";

export function ProtectedRoute() {
    const { user, isLoading, logoutReason } = useJwtAuth();
    const { isFullScreen } = useOutletLayout();
    const location = useLocation();

    const sidebarLinks: SidebarNavLink[] = [
        { name: "Dashboard", href: "/", icon: Activity },
        {
            name: "Clients",
            href: "/clients",
            icon: (props: LucideProps) => (
                <Landmark {...props} strokeWidth="1.75" />
            ),
        },
        {
            name: "Servers",
            href: "/servers",
            icon: Server,
        },
        { name: "Users", href: "/users", icon: Users },
        { name: "Logs", href: "/logs", icon: ScrollText },
        { name: "Settings", href: "/settings", icon: Settings },
    ];

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center" />
        );
    }

    if (!user) {
        if (logoutReason === "manual") {
            return <Navigate to="/login" replace />;
        }

        return (
            <Navigate
                to={`/login?returnTo=${encodeURIComponent(
                    location.pathname + location.search + location.hash,
                )}`}
                replace
            />
        );
    }

    return (
        <TooltipProvider>
            <BreadcrumbProvider>
                <div
                    className={
                        isFullScreen ? "flex h-screen overflow-hidden" : "flex"
                    }
                >
                    <SidebarNav links={sidebarLinks} />

                    {isFullScreen ? (
                        <main className="flex-1 flex flex-col min-h-0">
                            <Outlet />
                        </main>
                    ) : (
                        <main className="flex-1 flex flex-col px-8 py-8 sm:px-10 lg:px-12 gap-5 min-h-screen">
                            <TopBarNav />
                            <div className="flex-1 flex flex-col">
                                <Outlet />
                            </div>
                        </main>
                    )}
                </div>
            </BreadcrumbProvider>
            <Toaster richColors position="top-right" />
        </TooltipProvider>
    );
}
