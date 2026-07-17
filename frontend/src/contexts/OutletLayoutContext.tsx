import { createContext, useState, type RefObject } from "react";

type OutletLayoutContextType = {
    isFullScreen: boolean;
    setFullScreen: (value: boolean) => void;
    portalRef: RefObject<HTMLDivElement | null>;
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

    return (
        <OutletLayoutContext.Provider
            value={{
                isFullScreen,
                setFullScreen,
                portalRef,
            }}
        >
            {children}
        </OutletLayoutContext.Provider>
    );
}

export default OutletLayoutContext;
