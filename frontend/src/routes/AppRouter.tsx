import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLayout from "../layouts/AdminLayout";
import { RequireAuth } from "../auth/RequireAuth"; // ya lo tienes
import LoginPage from "../pages/LoginPage"; // ajusta
import DashboardPage from "../pages/dashboard/DashboardPage";
import VouchersPage from "../pages/vouchers/VouchersPage";
import BancoPage from "../pages/banco/BancoPage";
import RedeBanPage from "../pages/redeban/RedeBanPage";
import ConciliacionesPage from "../pages/conciliaciones/ConciliacionesPage";
import ParametrosPage from "../pages/parametros/ParametrosPage";
import SucursalesPage from "../pages/sucursales/SucursalesPage";
import UsersPage from "../pages/users/UsersPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          element={
            <RequireAuth>
              <AdminLayout />
            </RequireAuth>
          }
        >
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/vouchers" element={<VouchersPage />} />
          <Route path="/banco" element={<BancoPage />} />
          <Route path="/redeban" element={<RedeBanPage />} />
          <Route path="/conciliaciones" element={<ConciliacionesPage />} />
          <Route path="/parametros-sistema" element={<ParametrosPage />} />
          <Route path="/sucursales" element={<SucursalesPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
