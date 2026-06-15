import React, { createContext, useCallback, useEffect, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";

interface Crumb {
    label: string;
    href: string;
}

interface BreadcrumbContextType {
    histories: Record<string, Crumb[]>;
    setHistories: React.Dispatch<React.SetStateAction<Record<string, Crumb[]>>>;
    trail: Crumb[];
    addCrumb: (crumb: Crumb) => void;
    resetTrail: (root: string) => void;
    setRootPage: (root: string) => void;
    rootPage?: string;
    // goBack: () => void;
    // goForward: () => void;
    canGoBack: boolean;
    canGoForward: boolean;
    getCurrentCrumbHref: (root: string, fallbackUrl: string) => string;
    getRootPageManually: () => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | undefined>(
    undefined,
);

export const BreadcrumbProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const location = useLocation();
    const [searchParams] = useSearchParams();

    const [histories, setHistories] = useState<Record<string, Crumb[]>>(() => {
        try {
            const saved = sessionStorage.getItem("breadcrumbs");
            if (saved && saved !== "undefined") {
                const parsed = JSON.parse(saved);
                return parsed.histories ?? {};
            }
        } catch (e) {
            console.warn("Invalid breadcrumb data in storage. Resetting...", e);
        }
        return {};
    });

    const [activeIndices, setActiveIndices] = useState<Record<string, number>>(
        () => {
            try {
                const saved = sessionStorage.getItem("breadcrumbs");
                if (saved && saved !== "undefined") {
                    const parsed = JSON.parse(saved);
                    return parsed.activeIndices ?? {};
                }
            } catch (e) {
                console.warn(
                    "Invalid breadcrumb index data in storage. Resetting...",
                    e,
                );
            }
            return {};
        },
    );

    // Whenever histories or activeIndices change, persist both
    useEffect(() => {
        sessionStorage.setItem(
            "breadcrumbs",
            JSON.stringify({ histories, activeIndices }),
        );
    }, [histories, activeIndices]);

    const [rootPage, setRootPage] = useState<string | undefined>(() => {
        const savedRoot = sessionStorage.getItem("rootPage");
        return savedRoot || undefined;
    });

    useEffect(() => {
        if (rootPage) {
            sessionStorage.setItem("rootPage", rootPage);
        }
    }, [rootPage]);

    const addCrumb = useCallback(
        (crumb: Crumb) => {
            if (!rootPage) return;

            setHistories((prev) => {
                const history = prev[rootPage] || [];
                const idx = activeIndices[rootPage] ?? history.length - 1;
                const newHistory = history.slice(0, idx + 1);

                return { ...prev, [rootPage]: [...newHistory, crumb] };
            });

            setActiveIndices((prev) => {
                const history = histories[rootPage] || [];
                const idx = activeIndices[rootPage] ?? history.length - 1;
                const newTrailLength = history.slice(0, idx + 1).length;
                return { ...prev, [rootPage]: newTrailLength };
            });
        },
        [activeIndices, histories, rootPage],
    );

    useEffect(() => {
        const pathSegments = location.pathname.split("/").filter(Boolean);
        if (pathSegments.length < 2) return; // shallow path, skip

        // Base root from the first two segments → e.g. "/admin/students"
        const rootHref = `/${pathSegments[0]}/${pathSegments[1]}`;
        let urlRoot = searchParams.get("root");
        let currentHref = "";

        // If ?root is missing, insert it and sync state immediately
        if (!urlRoot) {
            urlRoot = rootPage ?? rootHref;
            searchParams.set("root", urlRoot ?? "");

            currentHref = `${location.pathname}?${searchParams.toString()}`;
            window.history.replaceState({}, "", currentHref);
        }

        // Sync rootPage if out of sync
        if (rootPage !== urlRoot) {
            setRootPage(urlRoot);
            return;
        }

        if (!currentHref) {
            // Always use the latest search params string for the crumb href
            const updatedSearch = searchParams.toString()
                ? `?${searchParams.toString()}`
                : "";
            currentHref = `${location.pathname}${updatedSearch}`;
        }

        const label = pathSegments[2] || pathSegments[1]; // use ID or page name

        // On the subsequent render, rootPage is guaranteed to be correct.
        // Now, we can safely check the history and add a new crumb.
        const historyForRoot = histories[rootPage] || [];
        if (historyForRoot.length === 0) {
            addCrumb({ label, href: currentHref });
            return;
        }

        const activeIdx = activeIndices[rootPage] ?? historyForRoot.length - 1;
        const activeCrumb = historyForRoot[activeIdx];

        // If the current URL is already the active crumb, do nothing.
        if (activeCrumb?.href === currentHref) return;
        console.log(currentHref);

        const existingIndex = historyForRoot.findIndex(
            (c) => c.href === currentHref,
        );
        if (existingIndex !== -1) {
            setActiveIndices((prev) => ({
                ...prev,
                [rootPage]: existingIndex,
            }));
            return;
        }

        addCrumb({ label, href: currentHref });
    }, [location, rootPage, histories, activeIndices, searchParams, addCrumb]);

    const getTrail = (): Crumb[] => {
        if (!rootPage) return [];
        const history = histories[rootPage] || [];
        const idx = activeIndices[rootPage] ?? -1;
        return history.slice(0, idx + 1);
    };

    const getCurrentCrumbHref = (root: string, fallbackUrl: string) => {
        return histories[root]?.[activeIndices[root]]?.href ?? fallbackUrl;
    };

    const resetTrail = (root: string) => {
        setRootPage(root);
        setActiveIndices((prev) => ({ ...prev, [root]: 0 }));
    };

    // const goBack = () => {
    //     if (!rootPage) return;
    //     setActiveIndices((prev) => ({
    //         ...prev,
    //         [rootPage]: Math.max((prev[rootPage] ?? 0) - 1, 0),
    //     }));
    // };

    // const goForward = () => {
    //     if (!rootPage) return;
    //     setActiveIndices((prev) => {
    //         const currentIndex = prev[rootPage] ?? 0;
    //         const historyLength = histories[rootPage]?.length ?? 0;
    //         return {
    //             ...prev,
    //             [rootPage]: Math.min(currentIndex + 1, historyLength - 1),
    //         };
    //     });
    // };

    const getRootPageManually = () => {
        const savedRoot = sessionStorage.getItem("rootPage");
        return savedRoot || undefined;
    };

    const trail = getTrail();
    const canGoBack = rootPage ? (activeIndices[rootPage] ?? 0) > 0 : false;
    const canGoForward = rootPage
        ? (activeIndices[rootPage] ?? 0) <
          (histories[rootPage]?.length ?? 0) - 1
        : false;

    return (
        <BreadcrumbContext.Provider
            value={{
                histories,
                setHistories,
                trail,
                addCrumb,
                resetTrail,
                setRootPage,
                rootPage,
                // goBack,
                // goForward,
                canGoBack,
                canGoForward,
                getCurrentCrumbHref,
                getRootPageManually,
            }}
        >
            {children}
        </BreadcrumbContext.Provider>
    );
};

export default BreadcrumbContext;
