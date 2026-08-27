import React, { useState, useEffect, useRef, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useOutletLayout } from "@/hooks/useOutletLayout";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { twMerge } from "tailwind-merge";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CircleUser, EllipsisVertical, Menu } from "lucide-react";
import { Button } from "./ui/button";
import ThemeToggle from "./ThemeToggle";

export interface SidebarNavLink {
    name: string;
    href: string;
    icon: React.ComponentType<{ variant?: string; className?: string }>;
}

interface SidebarNavProps {
    links?: SidebarNavLink[];
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ links = [] }) => {
    const location = useLocation();
    const { logout, user } = useAuthContext();
    const { isFullScreen, isSidebarCollapsed, setSidebarCollapsed } =
        useOutletLayout();

    const [popoverProfileOpen, setPopoverProfileOpen] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Close mobile overlay on route change
    useEffect(() => {
        setIsMobileOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                profileRef.current &&
                !profileRef.current.contains(event.target as Node) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setPopoverProfileOpen(false);
                event.stopPropagation();
            }
        };

        if (popoverProfileOpen) {
            document.addEventListener("click", handleClickOutside, true);
        }

        return () => {
            document.removeEventListener("click", handleClickOutside, true);
        };
    }, [popoverProfileOpen]);

    const isCollapsed = isSidebarCollapsed;

    useEffect(() => {
        localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
    }, [isCollapsed]);

    const toggleSidebar = () => {
        setSidebarCollapsed(!isCollapsed);
    };

    const navLinks = useMemo(() => links.map((link) => {
        const isActive =
            link.href === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(link.href);

        return (
            <Tooltip key={link.name}>
                <TooltipTrigger asChild>
                    <Link
                        to={link.href}
                        className={twMerge(
                            "rounded-xl transition-all duration-300 ease-in-out overflow-hidden cursor-pointer",
                            isCollapsed
                                ? "w-sidebar-button-collapsed"
                                : "w-full",
                            isActive
                                ? "bg-sidebar-active font-bold"
                                : "text-muted-foreground hover:bg-sidebar-hover",
                        )}
                    >
                        <div className="flex items-center gap-sidebar-item-gap p-sidebar-item-padding w-sidebar-button cursor-pointer">
                            {
                                <link.icon
                                    variant={
                                        isActive
                                            ? "fill"
                                            : "outline"
                                    }
                                    className={twMerge(
                                        "size-sidebar-icon p-sidebar-icon-padding",
                                        isActive
                                            ? "text-sidebar-foreground"
                                            : "text-foreground",
                                    )}
                                />
                            }
                            <label className="cursor-pointer text-[16px]">
                                {link.name}
                            </label>
                        </div>
                    </Link>
                </TooltipTrigger>
                <TooltipContent
                    side="right"
                    align="center"
                    hidden={!isCollapsed}
                    className={twMerge(
                        "relative bg-foreground text-background ring-transparent text-md font-semibold z-9999",
                        "[&>svg]:hidden",
                    )}
                >
                    <p>{link.name}</p>
                </TooltipContent>
            </Tooltip>
        );
    }), [links, location.pathname, isCollapsed]);

    return (
        <>
            {/* Top-Right Floating Burger on Mobile (ONLY THE BURGER SHOWN ON MOBILE TOP-RIGHT) */}
            <div className="md:hidden fixed top-3 right-3 z-50">
                <button
                    type="button"
                    onClick={() => setIsMobileOpen(true)}
                    className="p-2 rounded-xl bg-card/90 backdrop-blur-md border border-border/80 text-foreground shadow-md hover:bg-muted transition-colors cursor-pointer flex items-center justify-center"
                    aria-label="Open Navigation Menu"
                >
                    <Menu className="size-5" />
                </button>
            </div>

            {/* Mobile Backdrop */}
            <div
                className={`md:hidden fixed inset-0 bg-black/60 backdrop-blur-xs z-60 transition-opacity duration-300 ${isMobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                onClick={() => setIsMobileOpen(false)}
            />

            {/* Sidebar Aside Container */}
            <aside
                className={twMerge(
                    "flex flex-col bg-background text-foreground py-5 px-sidebar-padding gap-5 z-70",
                    // Desktop styles: fixed on left
                    "hidden md:flex fixed top-0 left-0 h-screen! overflow-x-hidden overflow-y-auto transition-all duration-300 ease-in-out",
                    isCollapsed ? "w-sidebar-collapsed" : "w-sidebar",
                    !isFullScreen && "border-r border-border/90",
                    // Mobile overlay styles: fixed on the RIGHT side (left-auto overrides left-0 from desktop base)
                    isMobileOpen && "flex! fixed inset-y-0 right-0 left-auto w-72 max-w-[85vw] shadow-2xl border-l border-border/90",
                )}
            >
                <div className="flex items-center justify-between p-sidebar-item-padding w-full cursor-pointer">
                    {/* Close button on mobile sidebar header (left side, since sidebar is on right) */}
                    <button
                        type="button"
                        onClick={() => setIsMobileOpen(false)}
                        className={`md:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer ${isMobileOpen ? "block" : "hidden"}`}
                    >
                        <Menu className="size-5 rotate-90" />
                    </button>
                    <div className="flex items-center gap-sidebar-item-gap">
                        <button
                            className="cursor-pointer hidden md:block"
                            onClick={toggleSidebar}
                        >
                            <Menu
                                className={twMerge(
                                    "size-sidebar-icon transition-all duration-300 ease-in-out p-sidebar-icon-padding-burger",
                                    isCollapsed && "rotate-180",
                                )}
                            />
                        </button>
                        <label className={twMerge(
                            "text-xl font-extrabold tracking-tight translate-x-[0.4rem]",
                            isCollapsed && !isMobileOpen ? "hidden" : "block",
                        )}>
                            <div className="flex items-center justify-center gap-3">
                                <span className="font-bold text-sm tracking-wide">
                                    Server Monitoring
                                </span>
                            </div>
                        </label>
                    </div>
                </div>

            <nav className="flex flex-col gap-1 mb-auto">
                {navLinks}
            </nav>

            <Popover
                open={popoverProfileOpen}
                onOpenChange={setPopoverProfileOpen}
            >
                <PopoverTrigger>
                    <ProfileBar isCollapsed={isCollapsed} user={user} />
                </PopoverTrigger>
                <PopoverContent
                    align="end"
                    side="right"
                    sideOffset={8}
                    className="w-80 bg-background p-5 rounded-lg flex flex-col gap-2 ring-foreground/50 z-9999"
                >
                    {isCollapsed ? (
                        <Link
                            to="/profile"
                            onClick={() => setPopoverProfileOpen(false)}
                            className="w-full block"
                        >
                            <ProfileBar user={user} asNavigation />
                        </Link>
                    ) : (
                        <Link
                            to="/profile"
                            onClick={() => setPopoverProfileOpen(false)}
                            className="flex gap-3 items-center px-4 py-2.5 rounded-lg transition-colors w-full hover:bg-muted cursor-pointer group text-sm"
                        >
                            <CircleUser className="size-5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                            <span className="font-medium text-foreground">Profile</span>
                        </Link>
                    )}
                    <ThemeToggle />

                    <Button
                        className="cursor-pointer"
                        label="Logout"
                        variant={"danger"}
                        onClick={logout}
                    />
                </PopoverContent>
            </Popover>
        </aside>
        </>
    );
};

const ProfileBar = ({
    asNavigation,
    isCollapsed = false,
    user,
}: {
    asNavigation?: boolean;
    isCollapsed?: boolean;
    user: {
        first_name?: string;
        last_name?: string;
        username?: string;
        email?: string;
        profile_picture_url?: string;
    } | null;
}) => {
    if (!user) return null;

    const firstName = user.first_name || "";
    const lastName = user.last_name || "";
    const username = user.username
        ? `@${user.username}`
        : user.email
          ? `@${user.email.split("@")[0]}`
          : "";
    const avatarSrc =
        user.profile_picture_url ||
        import.meta.env.VITE_DEFAULT_PROFILE_PICTURE ||
        "";

    if (asNavigation) {
        return (
            <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg transition-colors w-full hover:bg-muted cursor-pointer group text-sm">
                <div className="size-8 rounded-full overflow-hidden bg-foreground/10 shrink-0">
                    <img
                        src={avatarSrc}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="flex-1 flex flex-col text-left min-w-0">
                    <div className="font-semibold text-foreground/90 group-hover:text-foreground text-sm truncate">
                        {firstName} {lastName}
                    </div>
                    {username && (
                        <div className="text-xs text-muted-foreground truncate">
                            {username}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div
            className={twMerge(
                "rounded-xl transition-all duration-300 ease-in-out overflow-hidden cursor-pointer",
                isCollapsed ? "w-sidebar-button-collapsed" : "w-sidebar-button",
                "text-muted-foreground hover:bg-sidebar-hover",
            )}
        >
            <div className="flex items-center gap-sidebar-item-gap p-sidebar-item-padding w-sidebar-button cursor-pointer">
                <div className="size-sidebar-icon p-sidebar-icon-padding-profile shrink-0">
                    <div className="w-full h-full relative rounded-full overflow-hidden bg-foreground/10">
                        <img
                            src={avatarSrc}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
                <div className="leading-5 flex-1 w-full flex flex-col text-left min-w-0">
                    <div className="font-semibold text-foreground/80 group-hover:text-foreground text-sm truncate">
                        {firstName} {lastName}
                    </div>
                    {username && (
                        <div className="text-xs text-muted-foreground truncate font-normal">
                            {username}
                        </div>
                    )}
                </div>
                <EllipsisVertical className="ml-auto text-gray-400 size-5 shrink-0" />
            </div>
        </div>
    );
};
