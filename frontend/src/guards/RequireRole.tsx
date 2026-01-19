import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

type RequireRoleProps = {
  allowed: string[]; // Cambiado de "allowedRoles" a "allowed" para match con tu router
};

/**
 * Guard para proteger rutas por rol
 * Usa Outlet para renderizar rutas hijas
 * 
 * @example
 * // En el router:
 * {
 *   element: <RequireRole allowed={["ADMIN", "PROPIETARIO"]} />,
 *   children: [
 *     { path: "/admin", element: <AdminPage /> }
 *   ]
 * }
 */
export function RequireRole({ allowed }: RequireRoleProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user?.rol;
  
  if (!userRole || !allowed.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

// También exportamos una versión para usar como wrapper de componentes
export function RequireRoleWrapper({ 
  allowedRoles, 
  children 
}: { 
  allowedRoles: string[]; 
  children: React.ReactNode;
}) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const userRole = user?.rol;
  
  if (!userRole || !allowedRoles.includes(userRole)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="text-6xl">🚫</div>
          <h1 className="text-2xl font-bold">Acceso Denegado</h1>
          <p className="text-white/60">
            No tienes permisos para acceder a esta sección.
          </p>
          <p className="text-sm text-white/40">
            Tu rol: <span className="text-white">{userRole}</span>
          </p>
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20"
          >
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}