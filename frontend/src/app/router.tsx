import { createBrowserRouter, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../features/dashboard/pages/DashboardPage";
import NotFoundPage from "../pages/NotFoundPage";
import UnauthorizedPage from "../pages/UnauthorizedPage";
import AdminLayout from "../layouts/AdminLayout";
import { RequireAuth } from "../guards/RequireAuth";
import { RequireRole } from "../guards/RequireRole";
import BancoPage from "../features/banco/pages/BancoPage";
import BancoDetailPage from "../features/banco/pages/BancoDetailPage";
import ConciliacionesPage from "../pages/conciliaciones/ConciliacionesPage";
import ParametrosSistemaPage from "../pages/parametros/ParametrosPage";
import RedeBanPage from "../pages/redeban/RedeBanPage";
import SucursalesPage from "../features/sucursales/pages/SucursalesPage";
import UsersPage from "../features/users/pages/UsersPage";
import VouchersListPage from "../features/vouchers/pages/VouchersListPage";
import VoucherDetailPage from "../features/vouchers/pages/VoucherDetailPage";
import CreateVoucherDraftPage from "../features/vouchers/pages/CreateVoucherDraftPage";

export const router = createBrowserRouter([
  // Páginas públicas
  { path: "/login", element: <LoginPage /> },
  { path: "/unauthorized", element: <UnauthorizedPage /> },

  // Rutas protegidas
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AdminLayout />,
        children: [
          // Redirect inicial
          { path: "/", element: <Navigate to="/dashboard" replace /> },

          // ✅ Dashboard - TODOS los roles
          { path: "/dashboard", element: <DashboardPage /> },

          // ✅ Vouchers - TODOS los roles
          { 
            path: "/vouchers", 
            element: <VouchersListPage /> 
          },
          { 
            path: "/vouchers/:id", 
            element: <VoucherDetailPage /> 
          },
          { 
            path: "/vouchers/new", 
            element: <CreateVoucherDraftPage /> 
          },

          // ✅ Conciliaciones - TODOS los roles
          { 
            path: "/conciliaciones", 
            element: <ConciliacionesPage /> 
          },

          // ✅ RedeBan - TODOS los roles (INCLUYE OPERATIVO)
          { 
            path: "/redeban", 
            element: <RedeBanPage /> 
          },

          // ✅ Banco - TODOS los roles (INCLUYE OPERATIVO)
          { 
            path: "/banco", 
            element: <BancoPage /> 
          },
          { 
            path: "/banco/:id", 
            element: <BancoDetailPage /> 
          },
          // ❌ Rutas RESTRINGIDAS - Solo ADMIN, PROPIETARIO, SOPORTE, DESARROLLADOR
          // (SIN OPERATIVO)
          {
            element: <RequireRole allowed={["ADMIN", "PROPIETARIO", "SOPORTE", "DESARROLLADOR"]} />,
            children: [
              { path: "/sucursales", element: <SucursalesPage /> },
              { path: "/users", element: <UsersPage /> },
              { path: "/parametros", element: <ParametrosSistemaPage /> },
            ],
          },
        ],
      },
    ],
  },

  // 404
  { path: "*", element: <NotFoundPage /> },
]);