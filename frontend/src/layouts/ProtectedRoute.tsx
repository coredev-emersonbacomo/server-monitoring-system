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
    const { isFullScreen, portalRef, isSidebarCollapsed } = useOutletLayout();
    const location = useLocation();

    const sidebarMargin = isSidebarCollapsed
        ? "var(--sidebar-width-collapsed)"
        : "var(--sidebar-width)";

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
                <div className={isFullScreen ? "flex h-screen" : "flex"}>
                    <SidebarNav links={sidebarLinks} />

                    {isFullScreen ? (
                        <main
                            style={{ marginLeft: sidebarMargin }}
                            className="flex-1 flex flex-col min-h-0 relative transition-[margin] duration-300 ease-in-out"
                        >
                            <Outlet />
                            <div
                                ref={portalRef}
                                style={{ left: sidebarMargin }}
                                className="fixed inset-y-0 right-0 z-50 hidden has-[*]:flex has-[*]:flex-col has-[*]:min-h-0 has-[*]:bg-background has-[*]:overflow-y-auto has-[*]:*:h-dvh"
                            />
                        </main>
                    ) : (
                        <main
                            style={{ marginLeft: sidebarMargin }}
                            className="flex-1 flex flex-col px-8 py-8 sm:px-10 lg:px-12 gap-5 min-h-screen relative transition-[margin] duration-300 ease-in-out"
                        >
                            <TopBarNav />
                            <div className="flex-1 flex flex-col">
                                <Outlet />
                            </div>
                            <div
                                ref={portalRef}
                                style={{ left: sidebarMargin }}
                                className="fixed inset-y-0 right-0 z-50 hidden has-[*]:flex has-[*]:flex-col has-[*]:min-h-0 has-[*]:bg-background has-[*]:overflow-y-auto has-[*]:*:h-dvh"
                            />
                        </main>
                    )}
                </div>
            </BreadcrumbProvider>
            <Toaster richColors position="top-right" />
        </TooltipProvider>
    );
}
