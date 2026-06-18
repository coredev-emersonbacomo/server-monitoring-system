import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
    Activity,
    Settings,
    Users,
    Landmark,
    type LucideProps,
    ClipboardClock,
} from "lucide-react";
import { SidebarNav } from "@/components/SidebarNav";
import { BreadcrumbProvider } from "@/contexts/BreadCrumbContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import TopBarNav from "@/components/TopBarNav";
import { useAuthContext } from "@/hooks/useAuthContext";
import { Toaster } from "sonner";

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
    { name: "Logs", href: "/logs", icon: ClipboardClock },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function ProtectedRoute() {
    const { user, isLoading } = useAuthContext();
    const location = useLocation();

    if (isLoading) {
        return <div className="flex min-h-screen items-center justify-center" />;
    }

    if (!user) {
        return <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace />;
    }

    return (
        <TooltipProvider>
            <BreadcrumbProvider>
                <div className="flex min-h-screen">
                    <SidebarNav links={sidebarLinks} />

                    <main className="flex-1 flex flex-col min-h-0 overflow-auto p-5 gap-5">
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
