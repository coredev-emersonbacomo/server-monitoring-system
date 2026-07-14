import { createBrowserRouter } from "react-router-dom";
import Dashboard from "./pages/dashboard";
import Login from "./pages/login";
import { ProtectedRoute } from "./layouts/ProtectedRoute";
import { GuestLayout } from "./layouts/GuestLayout";
import Clients from "./pages/clients/index";
import UsersIndex from "./pages/users/index";
import ClientDetail from "./pages/clients/client-detail";
import LogsPage from "./pages/logs";
import ServerLayout from "./layouts/ServerLayout";
import ServerDetail from "./pages/servers/server-detail";
import CreateServer from "./pages/servers/create";
import ServersIndex from "./pages/servers/index";
import RootLayout from "./layouts/RootLayout";
import Settings from "./pages/settings";
import Sessions from "./pages/settings/sessions";
import Profile from "./pages/settings/profile";
import UserDetail from "./pages/users/user-detail";
import SystemSettings from "./pages/settings/system";
import AgentSettings from "./pages/settings/agent";
import AlertThresholds from "./pages/settings/thresholds";
import NodeConfigsIndex from "./pages/node-config/index";
import NodeConfigDetail from "./pages/node-config/node-config-detail";

const router = createBrowserRouter([
    {
        element: <RootLayout />,
        children: [
            {
                element: <GuestLayout />,
                children: [
                    {
                        path: "/login",
                        element: <Login />,
                    },
                ],
            },
            {
                element: <ProtectedRoute />,
                children: [
                    {
                        path: "/",
                        element: <Dashboard />,
                    },
                    {
                        path: "/servers",
                        element: <ServersIndex />,
                    },
                    {
                        path: "/servers/create",
                        element: <CreateServer />,
                    },
                    {
                        element: <ServerLayout />,
                        children: [
                            {
                                path: "/servers/:uuid",
                                element: <ServerDetail />,
                            },
                        ],
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
                        path: "/clients/:uuid",
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
                        path: "/users/:uuid",
                        element: <UserDetail />,
                    },
                    {
                        path: "/logs",
                        element: <LogsPage />,
                    },
                    {
                        path: "/settings",
                        element: <Settings />,
                    },
                    {
                        path: "/settings/sessions",
                        element: <Sessions />,
                    },
                    {
                        path: "/settings/system",
                        element: <SystemSettings />,
                    },
                    {
                        path: "/settings/agent",
                        element: <AgentSettings />,
                    },
                    {
                        path: "/settings/thresholds",
                        element: <AlertThresholds />,
                    },
                    {
                        path: "/settings/alerts",
                        element: <NodeConfigsIndex />,
                    },
                    {
                        path: "/settings/alerts/:id",
                        element: <NodeConfigDetail />,
                    },
                    {
                        path: "/profile",
                        element: <Profile />,
                    },
                ],
            },
        ],
    },
]);

export default router;
