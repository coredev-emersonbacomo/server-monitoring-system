import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import router from "./router";
import { ThemeProvider } from "./contexts/themeContext";
import { TooltipProvider } from "./components/ui/tooltip";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeProvider>
            <TooltipProvider>
                <RouterProvider router={router} />
            </TooltipProvider>
        </ThemeProvider>
    </StrictMode>,
);
