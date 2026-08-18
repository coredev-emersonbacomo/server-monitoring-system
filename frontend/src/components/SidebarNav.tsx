import React, { useState, useEffect, useRef } from "react";
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
    const profileRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

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

    return (
        <aside
            className={twMerge(
                "flex flex-col bg-background text-foreground py-5 px-sidebar-padding gap-5",
                isCollapsed ? "w-sidebar-collapsed" : "w-sidebar",
                "transition-all duration-300 ease-in-out overflow-x-hidden fixed top-0 left-0 h-screen! overflow-y-auto z-60",
                !isFullScreen && "border-r border-border/90",
            )}
        >
            <div className="flex items-center gap-sidebar-item-gap p-sidebar-item-padding w-sidebar-button cursor-pointer">
                <button className="cursor-pointer" onClick={toggleSidebar}>
                    <Menu
                        className={twMerge(
                            "size-sidebar-icon transition-all duration-300 ease-in-out p-sidebar-icon-padding-burger",
                            isCollapsed && "rotate-180",
                        )}
                    />
                </button>
                <label className="font-brand text-2xl font-extrabold tracking-tight translate-x-[0.4rem]">
                    Name
                </label>
                <Menu className="size-sidebar-icon opacity-0" />
            </div>

            <nav className="flex flex-col gap-1 mb-auto">
                {links.map((link) => {
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
                })}
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
                        >
                            <ProfileBar user={user} asNavigation />
                        </Link>
                    ) : (
                        <Link
                            to="/profile"
                            onClick={() => setPopoverProfileOpen(false)}
                            className="flex gap-3 items-center px-4 py-2 rounded-lg transition-colors w-full hover:bg-muted cursor-pointer"
                        >
                            <CircleUser className="size-5" />
                            <span>Profile</span>
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

    const firstName = user.first_name;
    const lastName = user.last_name;
    const username = user.username || user.email?.split("@")[0] || "";
    const avatarSrc =
        user.profile_picture_url ||
        import.meta.env.VITE_DEFAULT_PROFILE_PICTURE ||
        "";

    return (
        <div
            className={twMerge(
                "rounded-xl text-lg transition-all duration-300 ease-in-out overflow-hidden cursor-pointer",
                isCollapsed ? "w-sidebar-button-collapsed" : "w-sidebar-button",
                "text-muted-foreground hover:bg-sidebar-hover",
                asNavigation &&
                    "cursor-pointer rounded-lg py-2 hover:bg-foreground/2 hover:ring-transparent",
            )}
        >
            <div className="flex items-center gap-sidebar-item-gap p-sidebar-item-padding w-sidebar-button cursor-pointer">
                <div className="size-sidebar-icon p-sidebar-icon-padding-profile">
                    <div className="w-full h-full relative rounded-full overflow-hidden bg-foreground/10">
                        <img
                            src={avatarSrc}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                        />
                    </div>
                </div>
                <div className="leading-6 flex-1 w-full flex flex-col text-left min-w-0">
                    <div className="font-semibold text-foreground/80 group-hover:text-foreground text-base truncate">
                        {firstName} {lastName}
                    </div>
                    <span className="text-foreground/40 text-sm truncate">
                        @{username}
                    </span>
                </div>
                {!asNavigation && (
                    <EllipsisVertical className="ml-auto text-gray-400 size-5" />
                )}
            </div>
        </div>
    );
};
