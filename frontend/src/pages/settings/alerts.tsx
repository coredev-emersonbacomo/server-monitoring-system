import { Navigate } from "react-router-dom";
import { AlertVisualizer } from "./alerts/AlertVisualizer";

// Opt-in visual debugger. Kept off by default. The single root
// ALERTS_VISUAL_DEBUGGER flag controls this route: it's injected as
// VITE_ALERTS_VISUAL_DEBUGGER into the Vite process from the root env
// (.env.development / .env), so there's no separate frontend/.env.
const ENABLED = import.meta.env.VITE_ALERTS_VISUAL_DEBUGGER === "true";

export default function AlertsVisualizerRoute() {
    if (!ENABLED) {
        return <Navigate to="/settings" replace />;
    }

    return <AlertVisualizer />;
}
