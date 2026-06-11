import { type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface ProtectedRouteProps {
    children?: ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
    const { user } = useAuth();

    const navigate = useNavigate();

    if (!user) {
        navigate("/login");
    }

    return <>{children}</>;
}
