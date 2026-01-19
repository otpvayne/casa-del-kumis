import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import { RequireAuth } from "../guards/RequireAuth";
import { RequireRole } from "../guards/RequireRole";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/dashboard/DashboardPage";
import VouchersPage from "../pages/vouchers/VouchersPage";
import BancoPage from "../pages/banco/BancoPage";
import RedeBanPage from "../pages/redeban/RedeBanPage";
import ConciliacionesPage from "../pages/conciliaciones/ConciliacionesPage";
import ParametrosPage from "../pages/parametros/ParametrosPage";
import SucursalesPage from "../pages/sucursales/SucursalesPage";
import UsersPage from "../features/users/pages/UsersPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* LOGIN */}
        <Route path="/login" element={<LoginPage />} />

        {/* RUTAS PROTEGIDAS */}
        <Route
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Dashboard - Todos los roles */}
          <Route path="/dashboard" element={<DashboardPage />} />

          {/* Vouchers - Todos los roles */}
          <Route path="/vouchers" element={<VouchersPage />} />

          {/* Banco - Solo PROPIETARIO, ADMIN, DESARROLLADOR, SOPORTE */}
          <Route
            path="/banco"
            element={
              <RequireRole allowedRoles={["PROPIETARIO", "ADMIN", "DESARROLLADOR", "SOPORTE"]}>
                <BancoPage />
              </RequireRole>
            }
          />

          {/* RedeBan - Solo PROPIETARIO, ADMIN, DESARROLLADOR, SOPORTE */}
          <Route
            path="/redeban"
            element={
              <RequireRole allowedRoles={["PROPIETARIO", "ADMIN", "DESARROLLADOR", "SOPORTE"]}>
                <RedeBanPage />
              </RequireRole>
            }
          />

          {/* Conciliaciones - Todos */}
          <Route path="/conciliaciones" element={<ConciliacionesPage />} />

          {/* Parámetros - Todos */}
          <Route path="/parametros-sistema" element={<ParametrosPage />} />

          {/* Sucursales - Solo PROPIETARIO, ADMIN, DESARROLLADOR, SOPORTE */}
          <Route
            path="/sucursales"
            element={
              <RequireRole allowedRoles={["PROPIETARIO", "ADMIN", "DESARROLLADOR", "SOPORTE"]}>
                <SucursalesPage />
              </RequireRole>
            }
          />

          {/* Usuarios - Solo PROPIETARIO, ADMIN, DESARROLLADOR, SOPORTE */}
          <Route
            path="/users"
            element={
              <RequireRole allowedRoles={["PROPIETARIO", "ADMIN", "DESARROLLADOR", "SOPORTE"]}>
                <UsersPage />
              </RequireRole>
            }
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}