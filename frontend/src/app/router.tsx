import { createBrowserRouter, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/dashboard/DashboardPage";

import NotFoundPage from "../pages/NotFoundPage";
import UnauthorizedPage from "../pages/UnauthorizedPage";
import AdminLayout from "../layouts/AdminLayout";
import { RequireAuth } from "../guards/RequireAuth";
import { RequireRole } from "../guards/RequireRole";
import BancoPage from "../pages/banco/BancoPage";
import ConciliacionesPage from "../pages/conciliaciones/ConciliacionesPage";
import ParametrosSistemaPage from "../pages/parametros/ParametrosPage";
import RedeBanPage from "../pages/redeban/RedeBanPage";
import SucursalesPage from "../pages/sucursales/SucursalesPage";
import UsersPage from "../pages/users/UsersPage";
import VouchersListPage from "../features/vouchers/pages/VouchersListPage";
import VoucherDetailPage from "../features/vouchers/pages/VoucherDetailPage";
import CreateVoucherDraftPage from "../features/vouchers/pages/CreateVoucherDraftPage";


export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/unauthorized", element: <UnauthorizedPage /> },

  {
    element: <RequireAuth />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          // ✅ al entrar a "/" te manda al dashboard
          { path: "/", element: <Navigate to="/dashboard" replace /> },

          // ✅ rutas normales (cualquier usuario autenticado)
          { path: "/dashboard", element: <DashboardPage /> },

          // ✅ rutas protegidas por roles
          {
            element: (
              <RequireRole
                allowed={["ADMIN", "PROPIETARIO", "SOPORTE", "DESARROLLADOR"]}
              />
            ),
            children: [
              { path: "/sucursales", element: <SucursalesPage /> },
{ path: "/users", element: <UsersPage /> },
{ path: "/parametros", element: <ParametrosSistemaPage /> },
{ path: "/redeban", element: <RedeBanPage /> },
{ path: "/banco", element: <BancoPage /> },
{ path: "/conciliaciones", element: <ConciliacionesPage /> },
{ path: "/vouchers", element: <VouchersListPage /> },
{ path: "/vouchers/:id", element: <VoucherDetailPage /> },
{ path: "/vouchers/new", element: <CreateVoucherDraftPage /> },


            ],
          },
        ],
      },
    ],
  },

  { path: "*", element: <NotFoundPage /> },
]);
