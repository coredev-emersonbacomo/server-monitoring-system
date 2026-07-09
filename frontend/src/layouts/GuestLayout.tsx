import { useJwtAuth } from "@/hooks/useJwtAuth";
import { Navigate, Outlet, useLocation } from "react-router-dom";

export function GuestLayout() {
    const { user, isLoading } = useJwtAuth();
    const location = useLocation();

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center" />
        );
    }

    if (user) {
        const params = new URLSearchParams(location.search);
        const returnTo = params.get("returnTo");

        return <Navigate to={returnTo ?? "/"} replace />;
    }

    return <Outlet />;
}
