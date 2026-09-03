import { createContext, useContext, useRef, type ReactNode, type RefObject } from "react";

type OutletLayoutContextType = {
    isFullScreen: boolean;
    setFullScreen: (value: boolean) => void;
    portalRef: RefObject<HTMLDivElement | null>;
    isSidebarCollapsed: boolean;
    setSidebarCollapsed: (value: boolean) => void;
};

const dummyRef: RefObject<HTMLDivElement | null> = { current: null };

const OutletLayoutContext = createContext<OutletLayoutContextType>({
    isFullScreen: false,
    setFullScreen: () => {},
    portalRef: dummyRef,
    isSidebarCollapsed: false,
    setSidebarCollapsed: () => {},
});

export function OutletLayoutProvider({ children }: { children: ReactNode }) {
    const portalRef = useRef<HTMLDivElement | null>(null);

    return (
        <OutletLayoutContext.Provider
            value={{
                isFullScreen: false,
                setFullScreen: () => {},
                portalRef,
                isSidebarCollapsed: false,
                setSidebarCollapsed: () => {},
            }}
        >
            {children}
        </OutletLayoutContext.Provider>
    );
}

export function useOutletLayout() {
    return useContext(OutletLayoutContext);
}

export function useOutletFullScreen(_enabled = true) {
    // no-op in docs
}

export default OutletLayoutContext;
