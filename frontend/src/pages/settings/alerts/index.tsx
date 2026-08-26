import { Navigate } from "react-router-dom";
import { AlertVisualizer } from "./AlertVisualizer";

// Opt-in visual debugger. Kept off by default; flip VITE_ALERTS_VISUAL_DEBUGGER
// (in frontend/.env) to "true" to re-enable locally. The backend mirror flag
// is ALERTS_VISUAL_DEBUGGER (root .env) which gates the endpoint + broadcasts.
const ENABLED = import.meta.env.VITE_ALERTS_VISUAL_DEBUGGER === "true";

export default function AlertsVisualizerRoute() {
    if (!ENABLED) {
        return <Navigate to="/settings" replace />;
    }

    return <AlertVisualizer />;
}
