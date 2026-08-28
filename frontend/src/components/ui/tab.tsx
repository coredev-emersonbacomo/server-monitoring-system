import { useCallback, useState, Children, isValidElement } from "react";
import { useSearchParams } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TabItemProps {
    icon: LucideIcon;
    title: string;
    children: React.ReactNode;
}

interface TabProps {
    children: React.ReactNode;
    className?: string;
    syncUrl?: boolean;
    // Unique id used to namespace the URL param so nested Tabs on the same page
    // (e.g. a Tab inside another Tab's panel) don't fight over `?tab=`.
    id?: string;
}

const TAB_RADIUS = 12;

function Tab({ children, className, syncUrl = true, id }: TabProps) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [localTab, setLocalTab] = useState<string | null>(null);

    const paramKey = id ? `tab_${id}` : "tab";

    const items = Children.toArray(children).filter(
        (child): child is React.ReactElement<TabItemProps> =>
            isValidElement(child) &&
            typeof child.props === "object" &&
            child.props !== null &&
            "title" in child.props &&
            "icon" in child.props,
    );

    const activeTab = (() => {
        if (syncUrl) {
            const tabFromUrl = searchParams.get(paramKey);
            if (
                tabFromUrl &&
                items.some((item) => item.props.title === tabFromUrl)
            ) {
                return tabFromUrl;
            }
        } else if (
            localTab &&
            items.some((item) => item.props.title === localTab)
        ) {
            return localTab;
        }
        return items[0]?.props.title ?? "";
    })();

    const handleTabChange = useCallback(
        (title: string) => {
            if (syncUrl) {
                setSearchParams(
                    (prev) => {
                        const next = new URLSearchParams(prev);
                        next.set(paramKey, title);
                        return next;
                    },
                    { replace: true },
                );
            } else {
                setLocalTab(title);
            }
        },
        [syncUrl, setSearchParams, paramKey],
    );

    const activeItem =
        items.find((item) => item.props.title === activeTab) ?? items[0];

    return (
        <>
            <style>{`
                .chrome-tab {
                    position: relative;
                    z-index: 1;
                    border-top-left-radius: ${TAB_RADIUS}px;
                    border-top-right-radius: ${TAB_RADIUS}px;
                    transition: margin-bottom 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease;
                }
                .chrome-tab::before,
                .chrome-tab::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    width: ${TAB_RADIUS}px;
                    height: ${TAB_RADIUS}px;
                    z-index: -1;
                    pointer-events: none;
                }
                .chrome-tab::before {
                    left: -${TAB_RADIUS}px;
                    border-bottom-right-radius: ${TAB_RADIUS}px;
                    box-shadow: 4px 4px 0 4px var(--tab-bg);
                }
                .chrome-tab::after {
                    right: -${TAB_RADIUS}px;
                    border-bottom-left-radius: ${TAB_RADIUS}px;
                    box-shadow: -4px 4px 0 4px var(--tab-bg);
                }
                .chrome-tab-inactive::before,
                .chrome-tab-inactive::after {
                    display: none !important;
                }
                .chrome-tab.active {
                    z-index: 3;
                }
                .chrome-tab.active + .chrome-tab::before,
                .chrome-tab.active + .chrome-tab::after {
                    display: none;
                }
                .chrome-tab:first-child::before {
                    left: -${TAB_RADIUS}px;
                }
                .chrome-tab:last-child::after {
                    display: none;
                }
            `}</style>
            <div className={cn("relative ", className)}>
                <div className="flex items-end justify-end relative z-30">
                    {items.map((item) => {
                        const isActive = item.props.title === activeTab;
                        const Icon = item.props.icon;
                        return (
                            <button
                                key={item.props.title}
                                type="button"
                                onClick={() =>
                                    handleTabChange(item.props.title)
                                }
                                style={{
                                    ["--tab-bg" as string]: isActive
                                        ? "var(--color-card, oklch(0.25 0.02 260))"
                                        : "var(--color-background, oklch(0.15 0.01 260))",
                                }}
                                className={cn(
                                    "chrome-tab inline-flex items-center gap-1.5 px-5 py-2 text-sm cursor-pointer relative border border-border/60",
                                    isActive
                                        ? "active text-foreground cursor-default bg-card translate-y-0 mb-0 shadow-none border-b-card"
                                        : "chrome-tab-inactive text-muted-foreground hover:text-foreground bg-background/70 translate-y-0.5 mb-0.5 shadow-sm",
                                )}
                            >
                                <Icon size={14} />
                                {item.props.title}
                            </button>
                        );
                    })}
                </div>
                <div className="relative -mt-px z-20 rounded-tl-xl rounded-b-xl overflow-hidden">
                    {activeItem}
                </div>
            </div>
        </>
    );
}

function TabItem({ children }: TabItemProps) {
    return <>{children}</>;
}

Tab.Item = TabItem;

export { Tab };
