import { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";

type CanProps = {
  roles: string[];
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * Componente para mostrar contenido condicionalmente según roles
 * 
 * @example
 * <Can roles={["ADMIN", "PROPIETARIO"]}>
 *   <button>Solo admins ven esto</button>
 * </Can>
 */
export function Can({ roles, children, fallback = null }: CanProps) {
  const { hasRole } = useAuth();

  if (!hasRole(roles)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}