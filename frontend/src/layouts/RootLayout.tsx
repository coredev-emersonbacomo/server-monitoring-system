import { JwtAuthProvider } from "@/contexts/JwtAuthContext";
import { OutletLayoutProvider } from "@/contexts/OutletLayoutContext";
import { Outlet, ScrollRestoration } from "react-router-dom";

export default function RootLayout() {
    return (
        <OutletLayoutProvider>
            <JwtAuthProvider>
                <ScrollRestoration getKey={(loc) => loc.pathname} />
                <Outlet />
            </JwtAuthProvider>
        </OutletLayoutProvider>
    );
}
