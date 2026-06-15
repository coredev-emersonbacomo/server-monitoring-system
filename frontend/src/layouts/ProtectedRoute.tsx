import { Outlet } from "react-router-dom";
import { Activity } from "lucide-react";
import { SidebarNav } from "@/components/sidebarNav";
import { BreadcrumbProvider } from "@/contexts/breadCrumbContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import TopBarNav from "@/components/TopBarNav";

const sidebarLinks = [
    { name: "Dashboard", href: "/", icon: Activity },
    { name: "Coops", href: "/coops", icon: Activity },
    { name: "Users", href: "/users", icon: Activity },
    { name: "Settings", href: "/settings", icon: Activity },
];

export function ProtectedRoute() {
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
        </TooltipProvider>
    );
}
