import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/hooks/useAuthContext";
import { useAuth } from "@/hooks/useAuth";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { twMerge } from "tailwind-merge";
import ThemeToggle from "./themeToggle";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { CircleUser, EllipsisVertical, Menu } from "lucide-react";
import { Button } from "./ui/button";

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
    const { logout } = useAuthContext();
    const handleLogout = () => logout();

    const [popoverProfileOpen, setPopoverProfileOpen] = useState(false);
    const profileRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Only close if the click is neither on the profile button nor inside the dropdown content
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

        // Attach listener ONLY when dropdown is open
        if (popoverProfileOpen) {
            document.addEventListener("click", handleClickOutside, true);
        }

        // Clean up listener when component unmounts or dropdown closes
        return () => {
            document.removeEventListener("click", handleClickOutside, true);
        };
    }, [popoverProfileOpen]); // Re-run effect when DropdownProfileOpen changes

    // Load initial collapsed state from localStorage (default false)
    const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
        const stored = localStorage.getItem("sidebarCollapsed");
        return stored ? JSON.parse(stored) : false;
    });

    // Save to localStorage whenever it changes
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
            <div className="flex gap-sidebar-padding items-center h-16">
                <button className="p-2" onClick={toggleSidebar}>
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

            <nav className="flex flex-col gap-2">
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
                                        "py-0.5 rounded-xl text-lg transition-all duration-300 ease-in-out overflow-hidden cursor-pointer",
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
                                    // Arrow base
                                    "before:content-[''] before:absolute before:size-2 before:rotate-45",
                                    "before:bg-primary before:ring-transparent",
                                    // Position arrow based on side
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

            {/* Render Dropdown Outside Sidebar */}
            <Popover
                open={popoverProfileOpen}
                onOpenChange={setPopoverProfileOpen}
            >
                <PopoverTrigger asChild>
                    <div
                        className={twMerge(
                            "group py-2 rounded-xl text-lg transition-all duration-300 ease-in-out overflow-hidden",
                            "cursor-pointer mt-auto",
                            isCollapsed
                                ? "w-sidebar-button-collapsed"
                                : "w-full hover:bg-sidebar-hover",
                        )}
                    >
                        <div className="flex items-center gap-sidebar-padding w-sidebar-button">
                            <ProfileBar />
                            <EllipsisVertical className="ml-auto mr-3 text-gray-400 size-5" />
                        </div>
                    </div>
                </PopoverTrigger>

                <PopoverContent
                    align="end"
                    side="right"
                    sideOffset={8}
                    className="w-64 bg-background p-5 rounded-lg flex flex-col gap-sidebar-padding ring-transparent z-9999"
                >
                    {isCollapsed ? (
                        <ProfileBar
                            asNavigation
                            setPopoverOpen={setPopoverProfileOpen}
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
}: {
    asNavigation?: boolean;
    setPopoverOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
    const { data: user } = useAuth();
    const navigate = useNavigate();
    if (!user) return;

    const firstName = user.first_name;
    const lastName = user.last_name;
    const username = user.email?.split("@")[0] ?? "";

    return (
        <div
            className={twMerge(
                asNavigation &&
                    "cursor-pointer rounded-lg py-2 hover:bg-foreground/2 hover:ring-transparent",
            )}
            onClick={
                asNavigation
                    ? () => {
                          navigate("/profile");
                          setPopoverOpen?.(false);
                      }
                    : undefined
            }
        >
            <div
                className={twMerge(
                    "flex items-center gap-sidebar-section-gap",
                    asNavigation && "hover:scale-95 hover:pl-1",
                )}
            >
                <div
                    className={twMerge(
                        "w-[calc(var(--size-icon)+0.5rem)] aspect-square rounded-full overflow-hidden",
                        "border-2 border-white ring-transparent outline-foreground/10",
                        "group-hover:outline-1 group-hover:scale-105",
                    )}
                >
                    <div className="w-full h-full rounded-full overflow-hidden bg-foreground/10 flex items-center justify-center">
                        <span className="text-lg font-semibold text-foreground/60">
                            {firstName[0]}
                            {lastName[0]}
                        </span>
                    </div>
                </div>
                <div className="leading-6">
                    <div className="font-semibold text-foreground/80 group-hover:text-foreground text-[1.1rem]">
                        {firstName} {lastName}
                    </div>
                    <div className="text-foreground/40 -ml-0.5 text-base">
                        @{username}
                    </div>
                </div>
            </div>
        </div>
    );
};
