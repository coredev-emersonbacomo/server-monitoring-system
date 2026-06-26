import { createBrowserRouter, Outlet } from "react-router-dom";
import { JwtAuthProvider } from "./contexts/JwtAuthContext";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import { ProtectedRoute } from "./layouts/ProtectedRoute";
import { GuestLayout } from "./layouts/GuestLayout";
import Clients from "./pages/clients/Index";
import UsersIndex from "./pages/users/Index";
import UserDetail from "./pages/users/UserDetail";
import ClientDetail from "./pages/clients/ClientDetail";
import Settings from "./pages/Settings";
import Sessions from "./pages/Sessions";
import Logs from "./pages/Logs";
import ServerLayout from "./layouts/ServerLayout";
import ServerDetail from "./pages/servers/ServerDetail";
import { Profile } from "./pages/Profile";
import CreateServer from "./pages/servers/Create";
import ServersIndex from "./pages/servers/Index";

function RootLayout() {
  return (
    <JwtAuthProvider>
      <Outlet />
    </JwtAuthProvider>
  );
}

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
                path: "/servers/:id",
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
          {
            path: "/settings",
            element: <Settings />,
          },
          {
            path: "/settings/sessions",
            element: <Sessions />,
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
