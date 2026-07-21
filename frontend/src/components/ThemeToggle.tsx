import { Sun, Moon } from "lucide-react";
import { twMerge } from "tailwind-merge";
import { useTheme } from "@/hooks/useTheme";

export default function ThemeToggle({ className }: { className?: string }) {
    const { theme, toggleTheme } = useTheme();
    const Icon = theme === "dark" ? Sun : Moon;

    return (
        <button
            onClick={toggleTheme}
            className={twMerge(
                "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors w-full hover:bg-muted cursor-pointer",
                className,
            )}
        >
            <Icon className="size-5" />
            {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </button>
    );
}
