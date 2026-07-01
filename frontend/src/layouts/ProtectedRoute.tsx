import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
    Activity,
    Settings,
    Users,
    Landmark,
    type LucideProps,
    FileText,
    Terminal,
} from "lucide-react";
import { SidebarNav } from "@/components/SidebarNav";
import { BreadcrumbProvider } from "@/contexts/BreadCrumbContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import TopBarNav from "@/components/TopBarNav";
import { useJwtAuth } from "@/hooks/useJwtAuth";
import { Toaster } from "sonner";

export function ProtectedRoute() {
    const { user, isLoading } = useJwtAuth();
    const location = useLocation();

    const sidebarLinks = [
        { name: "Dashboard", href: "/", icon: Activity },
        {
            name: "Clients",
            href: "/clients",
            icon: (props: LucideProps) => (
                <Landmark {...props} strokeWidth="1.75" />
            ),
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
                <div className="flex h-screen overflow-hidden">
                    <SidebarNav links={sidebarLinks} />
                    <main className="flex-1 flex flex-col min-h-0 overflow-auto px-8 sm:px-10 lg:px-12 gap-5">
                        <TopBarNav />
                        <div className="flex-1 flex flex-col min-h-0">
                            <Outlet />
                        </div>
                    </main>
                </div>
            </BreadcrumbProvider>
            <Toaster richColors position="top-right" />
        </TooltipProvider>
    );
}
