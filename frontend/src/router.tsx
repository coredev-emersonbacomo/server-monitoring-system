import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense } from "react";
import { ProtectedRoute } from "./layouts/ProtectedRoute";
import { GuestLayout } from "./layouts/GuestLayout";
import RootLayout from "./layouts/RootLayout";
import ServerLayout from "./layouts/ServerLayout";

const Dashboard = lazy(() => import("./pages/dashboard/index"));
const Login = lazy(() => import("./pages/login"));
const ForgotPassword = lazy(() => import("./pages/forgot-password"));
const Clients = lazy(() => import("./pages/clients/index"));
const UsersIndex = lazy(() => import("./pages/users/index"));
const ClientDetail = lazy(() => import("./pages/clients/detail"));
const LogsPage = lazy(() => import("./pages/system-logs/index"));
const ServerDetail = lazy(() => import("./pages/servers/detail"));
const CreateServer = lazy(() => import("./pages/servers/create"));
const ServersIndex = lazy(() => import("./pages/servers/index"));
const Settings = lazy(() => import("./pages/settings/index"));
const Sessions = lazy(() => import("./pages/settings/sessions"));
const Profile = lazy(() => import("./pages/settings/profile"));
const UserDetail = lazy(() => import("./pages/users/detail"));
const SystemSettings = lazy(() => import("./pages/settings/system"));
const AgentSettings = lazy(() => import("./pages/settings/agent"));
const FileActivitySettings = lazy(() => import("./pages/settings/file-activity"));
const NodeConfigEditor = lazy(() =>
    import("./components/node-config/NodeConfigEditor").then(
        (m) => ({ default: m.NodeConfigEditor }),
    ),
);
const AlertVisualizer = lazy(() => import("./pages/settings/alerts"));
const ReportIndexPage = lazy(() => import("./pages/reports/report-index.tsx"));
const ReportsLayout = lazy(() => import("./layouts/ReportsLayout").then(
    (m) => ({ default: m.ReportsLayout }),
));
const MultiReportsPreview = lazy(() => import("./pages/reports/MultiReportsPreview.tsx"));

const router = createBrowserRouter([
    {
        element: <RootLayout />,
        children: [
            {
                element: <GuestLayout />,
                children: [
                    {
                        path: "/login",
                        element: (
                            <Suspense><Login /></Suspense>
                        ),
                    },
                    {
                        path: "/forgot-password",
                        element: (
                            <Suspense><ForgotPassword /></Suspense>
                        ),
                    },
                ],
            },
            {
                element: <ProtectedRoute />,
                children: [
                    {
                        path: "/",
                        element: (
                            <Suspense><Dashboard /></Suspense>
                        ),
                    },
                    {
                        path: "/servers",
                        element: (
                            <Suspense><ServersIndex /></Suspense>
                        ),
                    },
                    {
                        path: "/servers/create",
                        element: (
                            <Suspense><CreateServer /></Suspense>
                        ),
                    },
                    {
                        element: <ServerLayout />,
                        children: [
                            {
                                path: "/servers/:uuid",
                                element: (
                                    <Suspense><ServerDetail /></Suspense>
                                ),
                            },
                        ],
                    },
                    {
                        path: "/clients",
                        element: (
                            <Suspense><Clients /></Suspense>
                        ),
                    },
                    {
                        path: "/clients/create",
                        element: (
                            <Suspense><ClientDetail /></Suspense>
                        ),
                    },
                    {
                        path: "/clients/:uuid",
                        element: (
                            <Suspense><ClientDetail /></Suspense>
                        ),
                    },
                    {
                        path: "/users",
                        element: (
                            <Suspense><UsersIndex /></Suspense>
                        ),
                    },
                    {
                        path: "/users/create",
                        element: (
                            <Suspense><UserDetail /></Suspense>
                        ),
                    },
                    {
                        path: "/users/:uuid",
                        element: (
                            <Suspense><UserDetail /></Suspense>
                        ),
                    },
                    {
                        path: "/logs",
                        element: (
                            <Suspense><LogsPage /></Suspense>
                        ),
                    },
                    {
                        path: "/settings",
                        element: (
                            <Suspense><Settings /></Suspense>
                        ),
                    },
                    {
                        path: "/settings/sessions",
                        element: (
                            <Suspense><Sessions /></Suspense>
                        ),
                    },
                    {
                        path: "/settings/system",
                        element: (
                            <Suspense><SystemSettings /></Suspense>
                        ),
                    },
                    {
                        path: "/settings/agent",
                        element: (
                            <Suspense><AgentSettings /></Suspense>
                        ),
                    },
                    {
                        path: "/settings/file-activity",
                        element: (
                            <Suspense><FileActivitySettings /></Suspense>
                        ),
                    },
                    {
                        path: "/settings/alerts",
                        element: (
                            <Suspense>
                                <NodeConfigEditor configKey="alerts" alwaysMaximized />
                            </Suspense>
                        ),
                    },
                    {
                        path: "/settings/alerts/debugger",
                        element: (
                            <Suspense><AlertVisualizer /></Suspense>
                        ),
                    },
                    {
                        path: "/profile",
                        element: (
                            <Suspense><Profile /></Suspense>
                        ),
                    },
                    {
                        element: (
                            <Suspense><ReportsLayout /></Suspense>
                        ),
                        children: [
                            {
                                path: "/report",
                                element: (
                                    <Suspense><ReportIndexPage /></Suspense>
                                ),
                            },
                            {
                                path: "/report/servers/:uuid",
                                element: (
                                    <Suspense><ReportIndexPage /></Suspense>
                                ),
                            },
                            {
                                path: "/report/clients/:uuid",
                                element: (
                                    <Suspense><ReportIndexPage /></Suspense>
                                ),
                            },
                            {
                                path: "/report/servers",
                                element: (
                                    <Suspense><MultiReportsPreview /></Suspense>
                                ),
                            },
                            {
                                path: "/report/clients",
                                element: (
                                    <Suspense><MultiReportsPreview /></Suspense>
                                ),
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        path: "/printReport",
        element: (
            <Suspense><ReportIndexPage /></Suspense>
        ),
    },
]);

export default router;
