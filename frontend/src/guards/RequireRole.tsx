import { Navigate, Outlet } from "react-router-dom";
import { getUserFromToken } from "../lib/auth";

type Props = {
  allowed: string[];
};

export function RequireRole({ allowed }: Props) {
  const user = getUserFromToken();

  // Si no hay user o no hay rol, lo sacamos
  const rol = user?.rol;
  if (!rol) return <Navigate to="/login" replace />;

  if (!allowed.includes(rol)) return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
}
