import { JwtAuthProvider } from "@/contexts/JwtAuthContext";
import { Outlet, ScrollRestoration } from "react-router-dom";

export default function RootLayout() {
    return (
        <JwtAuthProvider>
            <ScrollRestoration />
            <Outlet />
        </JwtAuthProvider>
    );
}
