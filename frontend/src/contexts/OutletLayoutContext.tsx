import { createContext, useState, type RefObject } from "react";

type OutletLayoutContextType = {
    isFullScreen: boolean;
    setFullScreen: (value: boolean) => void;
    portalRef: RefObject<HTMLDivElement | null>;
    isSidebarCollapsed: boolean;
    setSidebarCollapsed: (value: boolean) => void;
};

const OutletLayoutContext = createContext<OutletLayoutContextType | null>(null);

export function OutletLayoutProvider({
    children,
    portalRef,
}: {
    children: React.ReactNode;
    portalRef: RefObject<HTMLDivElement | null>;
}) {
    const [isFullScreen, setFullScreen] = useState(false);
    const [isSidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
        const stored = localStorage.getItem("sidebarCollapsed");
        return stored ? JSON.parse(stored) : false;
    });

    return (
        <OutletLayoutContext.Provider
            value={{
                isFullScreen,
                setFullScreen,
                portalRef,
                isSidebarCollapsed,
                setSidebarCollapsed,
            }}
        >
            {children}
        </OutletLayoutContext.Provider>
    );
}

export default OutletLayoutContext;
