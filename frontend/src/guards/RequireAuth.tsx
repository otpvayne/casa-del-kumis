import { Navigate, Outlet } from "react-router-dom";
import { getToken, isTokenExpired } from "../lib/auth";

/**
 * Guard para proteger rutas que requieren autenticación
 * Usa Outlet para renderizar rutas hijas
 */
export function RequireAuth() {
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isTokenExpired()) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}