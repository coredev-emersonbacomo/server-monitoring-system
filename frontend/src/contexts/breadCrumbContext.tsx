import React, { createContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

interface Crumb {
    label: string;
    href: string;
}

interface BreadcrumbContextType {
    trail: Crumb[];
    setTrail: React.Dispatch<React.SetStateAction<Crumb[]>>;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(
    undefined,
);

export const BreadcrumbProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const location = useLocation();
    const [trail, setTrail] = useState<Crumb[]>([]);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTrail([]);
    }, [location.pathname]);

    return (
        <BreadcrumbContext.Provider value={{ trail, setTrail }}>
            {children}
        </BreadcrumbContext.Provider>
    );
};

export default BreadcrumbContext;
