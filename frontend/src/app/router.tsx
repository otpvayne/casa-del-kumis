import { createBrowserRouter } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import NotFoundPage from "../pages/NotFoundPage";
import UnauthorizedPage from "../pages/UnauthorizedPage";
import { RequireAuth } from "../guards/RequireAuth";
import { RequireRole } from "../guards/RequireRole";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/unauthorized", element: <UnauthorizedPage /> },

  {
    element: <RequireAuth />,
    children: [
      { path: "/", element: <DashboardPage /> },

      // Ejemplo de ruta protegida por rol:
      {
        element: <RequireRole allowed={["ADMIN", "PROPIETARIO", "SOPORTE", "DESARROLLADOR"]} />,
        children: [
          // aquí irán páginas como parámetros, logs, users...
          // { path: "/parametros", element: <ParametrosPage /> },
        ],
      },
    ],
  },

  { path: "*", element: <NotFoundPage /> },
]);
