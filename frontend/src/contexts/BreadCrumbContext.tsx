import React, { createContext, useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export interface Crumb {
    label: string;
    href: string;
}

interface BreadcrumbContextType {
    trail: Crumb[];
    isLoading: boolean;
    setTrail: (trail: Crumb[], isLoading?: boolean) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(
    undefined,
);

export const BreadcrumbProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const location = useLocation();
    const [trail, setTrailState] = useState<Crumb[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const setTrail = useCallback((newTrail: Crumb[], loading?: boolean) => {
        setTrailState(newTrail);
        setIsLoading(loading ?? false);
    }, []);

    useEffect(() => {
        setTrailState([]);
        setIsLoading(false);
    }, [location.pathname]);

    return (
        <BreadcrumbContext.Provider value={{ trail, isLoading, setTrail }}>
            {children}
        </BreadcrumbContext.Provider>
    );
};

export default BreadcrumbContext;
