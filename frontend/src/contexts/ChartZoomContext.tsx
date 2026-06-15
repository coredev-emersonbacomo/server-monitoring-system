import { createContext, useState, useCallback, type ReactNode } from "react";

interface ChartZoomContextValue {
    domain: [number, number] | null;
    setDomain: (domain: [number, number] | null) => void;
    resetDomain: () => void;
}

const ChartZoomContext = createContext<ChartZoomContextValue | null>(null);

export function ChartZoomProvider({ children }: { children: ReactNode }) {
    const [domain, setDomain] = useState<[number, number] | null>(null);

    const resetDomain = useCallback(() => setDomain(null), []);

    return (
        <ChartZoomContext.Provider value={{ domain, setDomain, resetDomain }}>
            {children}
        </ChartZoomContext.Provider>
    );
}

export default ChartZoomContext;
