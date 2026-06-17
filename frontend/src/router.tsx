import { createBrowserRouter } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import { ProtectedRoute } from "./layouts/ProtectedRoute";
import Coops from "./pages/Coops";
import UsersIndex from "./pages/users/Index";
import UsersCreate from "./pages/users/Create";
import UsersEdit from "./pages/users/Edit";
import CoopCreate from "./pages/CoopCreate";
import CoopEdit from "./pages/CoopEdit";
import Settings from "./pages/Settings";
import Logs from "./pages/Logs";

const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />,
    },
    {
        element: <ProtectedRoute />,
        children: [
            {
                path: "/",
                element: <Dashboard />,
            },
            {
                path: "/coops",
                element: <Coops />,
            },
            // ── Users ──────────────────────────────────
            {
                path: "/coops/create",
                element: <CoopCreate />,
            },
            {
                path: "/coops/:id/edit",
                element: <CoopEdit />,
            },
            {
                path: "/users",
                element: <UsersIndex />,
            },
            {
                path: "/users/create",
                element: <UsersCreate />,
            },
            {
                path: "/users/:id/edit",
                element: <UsersEdit />,
            },
            {
                path: "/logs",
                element: <Logs />,
            },
            // ───────────────────────────────────────────
            {
                path: "/settings",
                element: <Settings />,
            },
        ],
    },
]);

export default router;
