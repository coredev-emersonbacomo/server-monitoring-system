import { createContext, useState } from "react";

type OutletLayoutContextType = {
    isFullScreen: boolean;
    setFullScreen: (value: boolean) => void;
};

const OutletLayoutContext = createContext<OutletLayoutContextType | null>(null);

export function OutletLayoutProvider({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isFullScreen, setFullScreen] = useState(false);

    return (
        <OutletLayoutContext.Provider
            value={{
                isFullScreen,
                setFullScreen,
            }}
        >
            {children}
        </OutletLayoutContext.Provider>
    );
}

export default OutletLayoutContext;
