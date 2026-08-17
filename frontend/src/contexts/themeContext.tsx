import { createContext, useState, useEffect, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "coreDevLight" | "coreDevDark";

interface ThemeContextType {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

const ALL_THEME_CLASSES: ThemeMode[] = ["light", "dark", "coreDevLight", "coreDevDark"];

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
    const [theme, setTheme] = useState<ThemeMode>(() => {
        if (typeof window !== "undefined" && localStorage.getItem("theme")) {
            const saved = localStorage.getItem("theme") as ThemeMode;
            if (ALL_THEME_CLASSES.includes(saved)) {
                return saved;
            }
        }
        if (
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
        ) {
            return "dark";
        }
        return "light";
    });

    useEffect(() => {
        const root = window.document.documentElement;
        // Remove all known theme classes
        ALL_THEME_CLASSES.forEach((cls) => root.classList.remove(cls));

        // If it's a dark variant, add "dark" for tailwind dark: modifiers compatibility
        if (theme === "dark" || theme === "coreDevDark") {
            root.classList.add("dark");
        }
        root.classList.add(theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "dark" || prev === "coreDevDark" ? "light" : "dark"));
    };

    const value = { theme, setTheme, toggleTheme };

    return (
        <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
    );
};

export default ThemeContext;
