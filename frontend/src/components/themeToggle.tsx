import { Sun, Moon } from "lucide-react";
import { useState } from "react";
import { twMerge } from "tailwind-merge";

export default function ThemeToggle({ className }: { className?: string }) {
    const [dark, setDark] = useState(() =>
        document.documentElement.classList.contains("dark"),
    );

    const toggle = () => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle("dark", next);
    };

    return (
        <button
            onClick={toggle}
            className={twMerge(
                "flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-colors w-full hover:bg-muted",
                className,
            )}
        >
            {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            {dark ? "Light Mode" : "Dark Mode"}
        </button>
    );
}
