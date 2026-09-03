import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "coreDevLight" | "coreDevDark";

interface ThemeContextType {
    theme: ThemeMode;
    setTheme: (theme: ThemeMode) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
    theme: "light",
    setTheme: () => {},
    toggleTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setTheme] = useState<ThemeMode>(() => {
        if (typeof window !== "undefined" && localStorage.getItem("theme")) {
            return (localStorage.getItem("theme") as ThemeMode) || "light";
        }
        return "light";
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark", "coreDevLight", "coreDevDark");
        if (theme === "dark" || theme === "coreDevDark") {
            root.classList.add("dark");
        }
        root.classList.add(theme);
        localStorage.setItem("theme", theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === "dark" || prev === "coreDevDark" ? "light" : "dark"));
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
