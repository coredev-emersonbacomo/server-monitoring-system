import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
    Activity,
    Settings,
    Users,
    Landmark,
    type LucideProps,
    Server,
    ScrollText,
    FileBarChart,
} from "lucide-react";
import { SidebarNav, type SidebarNavLink } from "@/components/SidebarNav";
import { TooltipProvider } from "@/components/ui/tooltip";

import { useJwtAuth } from "@/hooks/useJwtAuth";
import { Toaster } from "sonner";
import { useOutletLayout } from "@/hooks/useOutletLayout";

export const sidebarLinks: SidebarNavLink[] = [
    { name: "Dashboard", href: "/", icon: Activity },
    {
        name: "Clients",
        href: "/clients",
        icon: (props: LucideProps) => (
            <Landmark {...props} strokeWidth="1.75" />
        ),
        isActive: ({ pathname, search }) => {
            if (pathname.startsWith("/clients")) return true;
            if (pathname.startsWith("/servers/")) {
                const params = new URLSearchParams(search);
                return params.get("client") !== "all";
            }
            return false;
        },
    },
    {
        name: "Servers",
        href: "/servers",
        icon: Server,
        isActive: ({ pathname, search }) => {
            if (pathname === "/servers") return true;
            if (pathname.startsWith("/servers/")) {
                const params = new URLSearchParams(search);
                return params.get("client") === "all";
            }
            return false;
        },
    },
    { name: "Users", href: "/users", icon: Users },
    { name: "Logs", href: "/logs", icon: ScrollText },
    { name: "Reports", href: "/report", icon: FileBarChart },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function ProtectedRoute() {
    const { user, isLoading, logoutReason } = useJwtAuth();
    const { isFullScreen, portalRef, isSidebarCollapsed } = useOutletLayout();
    const location = useLocation();

    const sidebarMargin = isSidebarCollapsed
        ? "var(--sidebar-width-collapsed)"
        : "var(--sidebar-width)";

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
            <div className={isFullScreen ? "flex h-screen" : "flex"}>
                <SidebarNav links={sidebarLinks} />

                {isFullScreen ? (
                    <main
                        style={{
                            marginLeft:
                                typeof window !== "undefined" && window.innerWidth < 768
                                    ? 0
                                    : undefined,
                        }}
                        className="flex-1 flex flex-col h-full min-h-0 relative overflow-y-auto [scrollbar-gutter:stable] md:[margin-left:var(--sidebar-margin)]"
                    >
                        <Outlet />
                        <div
                            ref={portalRef}
                            className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-margin)] z-50 hidden has-[*]:flex has-[*]:flex-col has-[*]:min-h-0 has-[*]:bg-background has-[*]:overflow-y-auto has-[*]:*:h-dvh"
                        />
                    </main>
                ) : (
                    <main
                        style={{
                            "--sidebar-margin": sidebarMargin,
                        } as React.CSSProperties}
                        className="flex-1 flex flex-col px-4 py-4 sm:px-8 sm:py-8 lg:px-12 gap-5 h-screen min-h-0 relative overflow-y-auto [scrollbar-gutter:stable] ml-0 md:ml-[var(--sidebar-margin)]"
                    >
                        <div className="flex-1 flex flex-col">
                            <Outlet />
                        </div>
                        <div
                            ref={portalRef}
                            className="fixed inset-y-0 right-0 left-0 md:left-[var(--sidebar-margin)] z-50 hidden has-[*]:flex has-[*]:flex-col has-[*]:min-h-0 has-[*]:bg-background has-[*]:overflow-y-auto has-[*]:*:h-dvh"
                        />
                    </main>
                )}
            </div>
            <Toaster richColors position="top-right" />
        </TooltipProvider>
    );
}
