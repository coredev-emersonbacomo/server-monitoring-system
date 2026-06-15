import BreadcrumbContext from "@/contexts/breadCrumbContext";
import { useContext } from "react";

export const useBreadcrumb = () => {
    const context = useContext(BreadcrumbContext);
    if (!context) {
        throw new Error("useBreadcrumb must be used within a BreadcrumbProvider");
    }
    return context;
};
