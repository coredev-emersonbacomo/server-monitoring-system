import { useRef } from "react";
import { JwtAuthProvider } from "@/contexts/JwtAuthContext";
import { OutletLayoutProvider } from "@/contexts/OutletLayoutContext";
import { Outlet, ScrollRestoration } from "react-router-dom";

export default function RootLayout() {
    const portalRef = useRef<HTMLDivElement>(null);

    return (
        <OutletLayoutProvider portalRef={portalRef}>
            <JwtAuthProvider>
                <ScrollRestoration getKey={(loc) => loc.pathname} />
                <Outlet />
            </JwtAuthProvider>
        </OutletLayoutProvider>
    );
}
