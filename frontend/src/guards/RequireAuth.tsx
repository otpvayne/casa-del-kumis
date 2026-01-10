import { Navigate, Outlet } from "react-router-dom";
import { getToken, isTokenExpired } from "../lib/auth";

export function RequireAuth() {
  const token = getToken();
  if (!token) return <Navigate to="/login" replace />;
  if (isTokenExpired()) return <Navigate to="/login" replace />;
  return <Outlet />;
}
