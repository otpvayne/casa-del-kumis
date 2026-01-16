import { Navigate, Outlet } from "react-router-dom";
import { getUserFromToken } from "../lib/auth";

type Props = {
  allowed: string[];
};

export function RequireRole({ allowed }: Props) {
  const user = getUserFromToken();
  const rol = user?.rol;

  if (!rol) {
    return <Navigate to="/login" replace />;
  }

  if (!allowed.includes(rol)) {
    return (
      <Navigate
        to="/unauthorized"
        replace
        state={{
          rol,
          allowed,
        }}
      />
    );
  }

  return <Outlet />;
}
