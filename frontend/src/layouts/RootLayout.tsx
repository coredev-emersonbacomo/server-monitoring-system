import { useEffect, useRef, useState } from "react";
import { JwtAuthProvider } from "@/contexts/JwtAuthContext";
import { OutletLayoutProvider } from "@/contexts/OutletLayoutContext";
import { Outlet, ScrollRestoration } from "react-router-dom";
import { FloatingChaosOverlay } from "@/components/FloatingChaosOverlay";

export default function RootLayout() {
    const portalRef = useRef<HTMLDivElement>(null);
    const [bringItOn, setBringItOn] = useState(false);

    useEffect(() => {
        let buffer = "";
        const maxLen = 15;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing inside inputs, textareas, or contentEditable
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
                buffer = (buffer + e.key.toUpperCase()).slice(-maxLen);

                if (buffer.endsWith("BUFFMEUP")) {
                    buffer = "";
                    document.documentElement.classList.toggle("buffed");
                } else if (buffer.endsWith("BRINGITON")) {
                    buffer = "";
                    setBringItOn((prev) => !prev);
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
                {bringItOn && <FloatingChaosOverlay />}
            </JwtAuthProvider>
        </OutletLayoutProvider>
    );
}
