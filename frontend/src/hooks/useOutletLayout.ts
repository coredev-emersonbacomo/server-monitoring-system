import OutletLayoutContext from "@/contexts/OutletLayoutContext";
import { useContext, useEffect } from "react";

export function useOutletLayout() {
    const context = useContext(OutletLayoutContext);

    if (!context) {
        throw new Error(
            "useOutletLayout must be used inside OutletLayoutProvider",
        );
    }

    return context;
}

export function useOutletFullScreen(enabled = true) {
    const { setFullScreen } = useOutletLayout();

    useEffect(() => {
        setFullScreen(enabled);

        return () => {
            setFullScreen(false);
        };
    }, [enabled, setFullScreen]);
}
