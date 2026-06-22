import { Navigate, Outlet } from "react-router-dom";
import { useAuthContext } from "@/hooks/useAuthContext";

export function GuestLayout() {
    const { user, isLoading } = useAuthContext();

    if (isLoading) {
        return <div className="flex min-h-screen items-center justify-center" />;
    }

    if (user) {
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
