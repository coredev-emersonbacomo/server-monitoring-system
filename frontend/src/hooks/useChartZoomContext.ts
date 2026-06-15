import ChartZoomContext from "@/contexts/ChartZoomContext";
import { useContext } from "react";

export function useChartZoomContext() {
    const ctx = useContext(ChartZoomContext);
    if (!ctx)
        throw new Error(
            "useChartZoomContext must be used inside <ChartZoomProvider>",
        );
    return ctx;
}
