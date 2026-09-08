import { useState } from "react";
import { Sun, Moon, Palette, Check, Sparkles } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import type { ThemeMode } from "@/contexts/themeContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface ThemeOption {
    id: ThemeMode;
    title: string;
    description: string;
    icon: typeof Sun;
    previewBg: string;
    previewBorder: string;
    previewAccent: string;
}

const THEME_OPTIONS: ThemeOption[] = [
    {
        id: "light",
        title: "Light Mode",
        description: "Classic clean white interface with neutral gray accents",
        icon: Sun,
        previewBg: "bg-white",
        previewBorder: "border-neutral-200",
        previewAccent: "bg-neutral-800",
    },
    {
        id: "dark",
        title: "Dark Mode",
        description: "Sleek dark interface with high-contrast elements",
        icon: Moon,
        previewBg: "bg-neutral-900",
        previewBorder: "border-neutral-700",
        previewAccent: "bg-neutral-100",
    },
    {
        id: "coreDevLight",
        title: "coreDev Light Mode",
        description: "Light mode with CoreDev signature vibrant orange highlights",
        icon: Sparkles,
        previewBg: "bg-neutral-50",
        previewBorder: "border-orange-200",
        previewAccent: "bg-orange-500",
    },
    {
        id: "coreDevDark",
        title: "coreDev Dark Mode",
        description: "Dark mode with CoreDev glowing orange sidebar & accents",
        icon: Sparkles,
        previewBg: "bg-neutral-900",
        previewBorder: "border-orange-500/30",
        previewAccent: "bg-orange-500",
    },
];

export default function ThemeToggle({
    className,
    variant = "icon",
    onOpenChange,
}: {
    className?: string;
    variant?: "icon" | "button";
    onOpenChange?: (open: boolean) => void;
}) {
    const { theme, setTheme } = useTheme();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleOpenModal = (open: boolean) => {
        setIsModalOpen(open);
        onOpenChange?.(open);
    };

    const currentOption =
        THEME_OPTIONS.find((opt) => opt.id === theme) || THEME_OPTIONS[0];
    const CurrentIcon = currentOption.icon;

    return (
        <>
            {variant === "icon" ? (
                <button
                    type="button"
                    aria-label="Change theme"
                    title={`Theme: ${currentOption.title}`}
                    onClick={() => handleOpenModal(true)}
                    className={cn(
                        "flex size-8 sm:size-9 items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer shrink-0",
                        className,
                    )}
                >
                    <CurrentIcon
                        className={cn(
                            "size-4 sm:size-4.5 transition-colors",
                            theme.includes("coreDev") ? "text-orange-500" : "text-muted-foreground group-hover:text-foreground",
                        )}
                    />
                </button>
            ) : (
                <button
                    type="button"
                    onClick={() => handleOpenModal(true)}
                    className={cn(
                        "flex items-center justify-between px-3 py-2 rounded-lg transition-colors w-full hover:bg-muted/70 cursor-pointer text-sm text-foreground group border border-border/50",
                        className,
                    )}
                >
                    <div className="flex items-center gap-2.5">
                        <Palette className="size-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                        <span className="font-medium text-xs sm:text-sm">Themes</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/75 text-[11px]">
                            {currentOption.title}
                        </span>
                        <CurrentIcon
                            className={cn(
                                "size-3.5 shrink-0",
                                theme.includes("coreDev")
                                    ? "text-orange-500"
                                    : "text-muted-foreground",
                            )}
                        />
                    </div>
                </button>
            )}

            {/* Theme Selection Modal */}
            <Dialog open={isModalOpen} onOpenChange={handleOpenModal}>
                <DialogContent className="sm:max-w-md p-6 bg-card border border-border shadow-2xl rounded-2xl">
                    <DialogHeader className="mb-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                    <Palette className="size-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-base font-semibold text-foreground">
                                        Appearance & Themes
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                        Choose your preferred display theme and accent color
                                    </DialogDescription>
                                </div>
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-2.5 pt-2">
                        {THEME_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            const isSelected = theme === option.id;
                            const isCoreDev = option.id.includes("coreDev");

                            return (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => {
                                        setTheme(option.id);
                                    }}
                                    className={cn(
                                        "relative flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all cursor-pointer group",
                                        isSelected
                                            ? isCoreDev
                                                ? "border-orange-500/80 bg-orange-500/5 shadow-xs ring-1 ring-orange-500/40"
                                                : "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/40"
                                            : "border-border/70 hover:border-border hover:bg-muted/40",
                                    )}
                                >
                                    {/* Theme preview swatch */}
                                    <div
                                        className={cn(
                                            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border shadow-xs relative overflow-hidden",
                                            option.previewBg,
                                            option.previewBorder,
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "w-4 h-4 rounded-full flex items-center justify-center",
                                                option.previewAccent,
                                            )}
                                        >
                                            <Icon
                                                className={cn(
                                                    "size-2.5",
                                                    option.id === "light"
                                                        ? "text-white"
                                                        : option.id === "dark"
                                                          ? "text-black"
                                                          : "text-white",
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {/* Text Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className={cn(
                                                    "text-sm font-semibold truncate",
                                                    isSelected
                                                        ? "text-foreground font-bold"
                                                        : "text-foreground/90 group-hover:text-foreground",
                                                )}
                                            >
                                                {option.title}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                            {option.description}
                                        </p>
                                    </div>

                                    {/* Check icon */}
                                    <div
                                        className={cn(
                                            "size-5 rounded-full flex items-center justify-center shrink-0 transition-colors",
                                            isSelected
                                                ? isCoreDev
                                                    ? "bg-orange-500 text-white"
                                                    : "bg-primary text-primary-foreground"
                                                : "border border-border/80 opacity-0 group-hover:opacity-40",
                                        )}
                                    >
                                        {isSelected && (
                                            <Check className="size-3 stroke-[3]" />
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
