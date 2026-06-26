import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/hooks/useAuthContext";
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

interface SidebarNavLink {
    name: string;
    href: string;
    icon: React.ComponentType<{ variant?: string; className?: string }>;
}

interface SidebarNavProps {
    links?: SidebarNavLink[];
}

export const SidebarNav: React.FC<SidebarNavProps> = ({ links = [] }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { logout, user } = useAuthContext();
    const handleLogout = () => logout();

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

    const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
        const stored = localStorage.getItem("sidebarCollapsed");
        return stored ? JSON.parse(stored) : false;
    });

    useEffect(() => {
        localStorage.setItem("sidebarCollapsed", JSON.stringify(isCollapsed));
    }, [isCollapsed]);

    const toggleSidebar = () => {
        setIsCollapsed((prev) => !prev);
    };

    return (
        <aside
            className={twMerge(
                "flex flex-col gap-sidebar-section-gap bg-background text-foreground py-5 px-sidebar-padding",
                isCollapsed ? "w-sidebar-collapsed" : "w-sidebar",
                "transition-all duration-300 ease-in-out overflow-x-hidden ring ring-sidebar-ring sticky top-0 h-screen! overflow-y-auto",
            )}
        >
            <div className="flex gap-sidebar-section-gap items-center h-16">
                <button
                    className="p-sidebar-item-padding"
                    onClick={toggleSidebar}
                >
                    <Menu
                        className={twMerge(
                            "size-icon cursor-pointer transition-all duration-300 ease-in-out",
                            isCollapsed && "rotate-180",
                        )}
                    />
                </button>
                <label className="text-4xl font-bold tracking-tight mx-auto -translate-y-0.5">
                    Name
                </label>
                <Menu className="size-icon opacity-0" />
            </div>

            <nav className="flex flex-col gap-2 mb-auto">
                {links.map((link) => {
                    const isActive =
                        link.href === "/"
                            ? location.pathname === "/"
                            : location.pathname.startsWith(link.href);

                    return (
                        <Tooltip key={link.name}>
                            <TooltipTrigger asChild>
                                <div
                                    onClick={() => {
                                        navigate(link.href);
                                    }}
                                    className={twMerge(
                                        "rounded-xl text-lg transition-all duration-300 ease-in-out overflow-hidden cursor-pointer",
                                        isCollapsed
                                            ? "w-sidebar-button-collapsed"
                                            : "w-full",
                                        isActive
                                            ? "bg-sidebar-active font-bold"
                                            : "text-muted-foreground hover:bg-sidebar-hover",
                                    )}
                                >
                                    <div className="flex items-center gap-sidebar-section-gap p-sidebar-item-padding w-sidebar-button">
                                        {
                                            <link.icon
                                                variant={
                                                    isActive
                                                        ? "fill"
                                                        : "outline"
                                                }
                                                className={twMerge(
                                                    "size-icon",
                                                    isActive
                                                        ? "text-sidebar-foreground"
                                                        : "text-foreground",
                                                )}
                                            />
                                        }
                                        <label>{link.name}</label>
                                    </div>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent
                                side="right"
                                align="center"
                                hidden={!isCollapsed}
                                className={twMerge(
                                    "relative bg-primary text-primary-foreground ring-transparent text-md font-semibold",
                                    "before:content-[''] before:absolute before:size-2 before:rotate-45",
                                    "before:bg-primary before:ring-transparent",
                                    "data-[side=top]:before:-bottom-1 data-[side=top]:before:left-1/2 data-[side=top]:before:-translate-x-1/2",
                                    "data-[side=bottom]:before:-top-1 data-[side=bottom]:before:left-1/2 data-[side=bottom]:before:-translate-x-1/2",
                                    "data-[side=left]:before:-right-1 data-[side=left]:before:top-1/2 data-[side=left]:before:-translate-y-1/2",
                                    "data-[side=right]:before:-left-1 data-[side=right]:before:top-1/2 data-[side=right]:before:-translate-y-1/2",
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
                    className="w-64 bg-background p-5 rounded-lg flex flex-col gap-sidebar-section-gap ring-foreground/50 z-9999"
                >
                    {isCollapsed ? (
                        <ProfileBar
                            asNavigation
                            setPopoverOpen={setPopoverProfileOpen}
                            user={user}
                        />
                    ) : (
                        <Button
                            variant={"outline"}
                            icon={<CircleUser />}
                            label="Profile"
                            onClick={() => navigate("/profile")}
                        />
                    )}
                    <ThemeToggle />

                    <Button
                        label="Logout"
                        variant={"danger"}
                        onClick={handleLogout}
                    />
                </PopoverContent>
            </Popover>
        </aside>
    );
};

const ProfileBar = ({
    asNavigation,
    setPopoverOpen,
    isCollapsed = false,
    user,
}: {
    asNavigation?: boolean;
    setPopoverOpen?: React.Dispatch<React.SetStateAction<boolean>>;
    isCollapsed?: boolean;
    user: { first_name?: string; last_name?: string; email?: string; profile_picture_url?: string } | null;
}) => {
    const navigate = useNavigate();
    if (!user) return null;

    const firstName = user.first_name;
    const lastName = user.last_name;
    const username = user.email?.split("@")[0] ?? "";
    const avatarSrc = user.profile_picture_url || import.meta.env.VITE_DEFAULT_PROFILE_PICTURE || '';

    return (
        <div
            onClick={
                asNavigation
                    ? () => {
                          navigate("/profile");
                          setPopoverOpen?.(false);
                      }
                    : undefined
            }
            className={twMerge(
                "rounded-xl text-lg transition-all duration-300 ease-in-out overflow-hidden cursor-pointer",
                isCollapsed ? "w-sidebar-button-collapsed" : "w-sidebar-button",
                "text-muted-foreground hover:bg-sidebar-hover",
                asNavigation &&
                    "cursor-pointer rounded-lg py-2 hover:bg-foreground/2 hover:ring-transparent",
            )}
        >
            <div className="flex items-center gap-sidebar-section-gap p-[calc(var(--spacing-sidebar-item-padding)-0.25rem)] w-sidebar-button">
                <div className="size-[calc(var(--size-icon)+0.5rem)] rounded-full overflow-hidden bg-foreground/10">
                    <img
                        src={avatarSrc}
                        alt="Avatar"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="leading-6 flex-1 w-full flex flex-col">
                    <div className="font-semibold text-foreground/80 group-hover:text-foreground text-[1.1rem]">
                        {firstName} {lastName}
                    </div>
                    <span className="text-foreground/40 text-base text-left">
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
