import { useEffect, useRef } from "react";
import { JwtAuthProvider } from "@/contexts/JwtAuthContext";
import { OutletLayoutProvider } from "@/contexts/OutletLayoutContext";
import { Outlet, ScrollRestoration } from "react-router-dom";

export default function RootLayout() {
    const portalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const cheatCode = "HESOYAM";
        let buffer = "";

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing inside text input fields or textareas
            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === "INPUT" ||
                    target.tagName === "TEXTAREA" ||
                    target.isContentEditable)
            ) {
                return;
            }

            if (e.key && e.key.length === 1) {
                buffer += e.key.toUpperCase();
                if (buffer.length > cheatCode.length) {
                    buffer = buffer.slice(-cheatCode.length);
                }
                if (buffer === cheatCode) {
                    buffer = "";
                    window.location.reload();
                }
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <OutletLayoutProvider portalRef={portalRef}>
            <JwtAuthProvider>
                <ScrollRestoration getKey={(loc) => loc.pathname} />
                <Outlet />
            </JwtAuthProvider>
        </OutletLayoutProvider>
    );
}
