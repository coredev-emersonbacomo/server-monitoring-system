import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuthContext } from "@/hooks/useAuthContext";

export function ProtectedRoute() {
    // const { user, isLoading } = useAuthContext();

    // if (isLoading) {
    //     return (
    //         <div className="flex items-center justify-center min-h-screen bg-background">
    //             <Loader2 className="w-8 h-8 animate-spin text-primary" />
    //         </div>
    //     );
    // }

    // if (!user) {
    //     return <Navigate to="/login" replace />;
    // }

    return <Outlet />;
}
