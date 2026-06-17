import { createBrowserRouter } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import { ProtectedRoute } from "./layouts/ProtectedRoute";
import Clients from "./pages/Clients";
import UsersIndex from "./pages/users/Index";
import UsersCreate from "./pages/users/Create";
import UsersEdit from "./pages/users/Edit";
import ClientCreate from "./pages/ClientCreate";
import ClientEdit from "./pages/ClientEdit";
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
                path: "/clients",
                element: <Clients />,
            },
            // ── Users ──────────────────────────────────
            {
                path: "/clients/create",
                element: <ClientCreate />,
            },
            {
                path: "/clients/:id/edit",
                element: <ClientEdit />,
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
