import { JwtAuthProvider } from "@/contexts/JwtAuthContext";
import { Outlet, ScrollRestoration } from "react-router-dom";

export default function RootLayout() {
    return (
        <JwtAuthProvider>
            <ScrollRestoration
                getKey={(loc) => loc.pathname}
            />
            <Outlet />
        </JwtAuthProvider>
    );
}
