import { createBrowserRouter, Navigate } from "react-router-dom";
import Docs from "./pages/docs/index";

const router = createBrowserRouter([
    {
        path: "/",
        element: <Navigate to="/docs/overview" replace />,
    },
    {
        path: "/docs",
        element: <Navigate to="/docs/overview" replace />,
    },
    {
        path: "/docs/:sectionId",
        element: <Docs />,
    },
]);

export default router;
