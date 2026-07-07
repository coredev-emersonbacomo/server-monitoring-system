import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
    Activity,
    Settings,
    Users,
    Landmark,
    type LucideProps,
    FileText,
    Terminal,
    Server,
} from "lucide-react";
import { SidebarNav, type SidebarNavLink } from "@/components/SidebarNav";
import { BreadcrumbProvider } from "@/contexts/BreadCrumbContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import TopBarNav from "@/components/TopBarNav";
import { useJwtAuth } from "@/hooks/useJwtAuth";
import { Toaster } from "sonner";

export function ProtectedRoute() {
    const { user, isLoading } = useJwtAuth();
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
        { name: "Server Logs", href: "/server-logs", icon: FileText },
        { name: "System Logs", href: "/system-logs", icon: Terminal },
        { name: "Settings", href: "/settings", icon: Settings },
    ];

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center" />
        );
    }

    if (!user) {
        return (
            <Navigate
                to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`}
                replace
            />
        );
    }

    return (
        <TooltipProvider>
            <BreadcrumbProvider>
                <div className="flex">
                    <SidebarNav links={sidebarLinks} />
                    <main className="flex-1 flex flex-col px-8 py-8 sm:px-10 lg:px-12 gap-5 min-h-screen">
                        <TopBarNav />
                        <div className="flex-1 flex flex-col">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </BreadcrumbProvider>
            <Toaster richColors position="top-right" />
        </TooltipProvider>
    );
}
