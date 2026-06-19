import { createBrowserRouter } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import { ProtectedRoute } from "./layouts/ProtectedRoute";
import Clients from "./pages/clients/Index";
import UsersIndex from "./pages/users/Index";
import UserDetail from "./pages/UserDetail";
import ClientDetail from "./pages/clients/ClientDetail";
import Settings from "./pages/Settings";
import Logs from "./pages/Logs";
import ServerDetail from "./pages/ServerDetail";
import { Profile } from "./pages/Profile";
import CreateServer from "./pages/servers/Create";

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
                path: "/servers/create",
                element: <CreateServer />,
            },
            {
                path: "/servers/:id",
                element: <ServerDetail />,
            },
            {
                path: "/clients",
                element: <Clients />,
            },
            {
                path: "/clients/create",
                element: <ClientDetail />,
            },
            {
                path: "/clients/:id",
                element: <ClientDetail />,
            },
            {
                path: "/users",
                element: <UsersIndex />,
            },
            {
                path: "/users/create",
                element: <UserDetail />,
            },
            {
                path: "/users/:id",
                element: <UserDetail />,
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
            {
                path: "/profile",
                element: <Profile />,
            },
        ],
    },
]);

export default router;
