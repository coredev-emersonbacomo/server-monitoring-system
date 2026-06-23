import { Navigate, Outlet } from "react-router-dom";
import { useJwtAuth } from "@/hooks/useJwtAuth";

export function GuestLayout() {
  const { user, isLoading } = useJwtAuth();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center" />;
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
