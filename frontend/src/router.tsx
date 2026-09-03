import { createBrowserRouter } from "react-router-dom";
import Dashboard from "./pages/dashboard/index";
import Login from "./pages/login";
import ForgotPassword from "./pages/forgot-password";
import { ProtectedRoute } from "./layouts/ProtectedRoute";
import { GuestLayout } from "./layouts/GuestLayout";
import Clients from "./pages/clients/index";
import UsersIndex from "./pages/users/index";
import ClientDetail from "./pages/clients/detail";
import LogsPage from "./pages/system-logs/index";
import ServerLayout from "./layouts/ServerLayout";
import ServerDetail from "./pages/servers/detail";
import CreateServer from "./pages/servers/create";
import ServersIndex from "./pages/servers/index";
import RootLayout from "./layouts/RootLayout";
import Settings from "./pages/settings/index";
import Sessions from "./pages/settings/sessions";
import Profile from "./pages/settings/profile";
import UserDetail from "./pages/users/detail";
import SystemSettings from "./pages/settings/system";
import AgentSettings from "./pages/settings/agent";
import FileActivitySettings from "./pages/settings/file-activity";
import { NodeConfigEditor } from "./components/node-config/NodeConfigEditor";
import AlertVisualizer from "./pages/settings/alerts";
import ReportIndexPage from "./pages/reports/report-index.tsx";
import { ReportsLayout } from "./layouts/ReportsLayout";
import MultiReportsPreview from "./pages/reports/MultiReportsPreview.tsx";

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
                    {
                        path: "/forgot-password",
                        element: <ForgotPassword />,
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
                        path: "/settings/file-activity",
                        element: <FileActivitySettings />,
                    },
                    {
                        path: "/settings/alerts",
                        element: (
                            <NodeConfigEditor
                                configKey="alerts"
                                alwaysMaximized
                            />
                        ),
                    },
                    {
                        path: "/settings/alerts/debugger",
                        element: <AlertVisualizer />,
                    },
                    {
                        path: "/profile",
                        element: <Profile />,
                    },
                    {
                        element: <ReportsLayout />,
                        children: [
                            {
                                path: "/report",
                                element: <ReportIndexPage />,
                            },
                            {
                                path: "/report/servers/:uuid",
                                element: <ReportIndexPage />,
                            },
                            {
                                path: "/report/clients/:uuid",
                                element: <ReportIndexPage />,
                            },
                            {
                                path: "/report/servers",
                                element: <MultiReportsPreview />,
                            },
                            {
                                path: "/report/clients",
                                element: <MultiReportsPreview />,
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        path: "/printReport",
        element: <ReportIndexPage />,
    },
]);

export default router;
