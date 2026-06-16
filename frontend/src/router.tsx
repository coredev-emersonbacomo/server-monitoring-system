import { createBrowserRouter } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import { ProtectedRoute } from "./layouts/ProtectedRoute";
import Coops from "./pages/Coops";
import Users from "./pages/Users";
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
            {
                path: "/users",
                element: <Users />,
            },
            {
                path: "/logs",
                element: <Logs />,
            },
            {
                path: "/settings",
                element: <Settings />,
            },
        ],
    },
]);

export default router;
