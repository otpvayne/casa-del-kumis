import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { navItems } from "../routes/routeConfig";

export function Sidebar() {
  const { user, logout } = useAuth();

  // Filtrar items del menú según el rol del usuario
  const visibleItems = navItems.filter((item) => {
    if (!user?.rol) return false;
    return item.roles.includes(user.rol as any);
  });

  function handleLogout() {
    if (!confirm("¿Cerrar sesión?")) return;
    logout();
  }

  return (
    <aside className="w-64 border-r border-white/10 bg-black/20 p-4 flex flex-col justify-between h-screen sticky top-0">
      {/* ARRIBA */}
      <div>
        {/* LOGO / TÍTULO */}
        <div className="mb-6">
          <div className="text-xl font-bold text-sky-400">Casa del Kumis</div>
          <div className="text-xs text-white/40 mt-1">Sistema de Gestión</div>
        </div>

        {/* INFO USUARIO */}
        <div className="mb-6 p-3 rounded-lg bg-white/5 border border-white/10">
          <div className="text-sm font-semibold truncate">
            {user?.nombre || user?.email || "Usuario"}
          </div>
          <div className="text-xs text-white/60 mt-1">
            Rol: <span className="text-sky-400 font-medium">{user?.rol || "—"}</span>
          </div>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex flex-col gap-1">
          {visibleItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-sky-500/20 text-sky-400 border border-sky-500/30"
                    : "hover:bg-white/5 text-white/80 hover:text-white border border-transparent",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* MENSAJE SI NO HAY ITEMS */}
        {visibleItems.length === 0 && (
          <div className="text-xs text-white/40 text-center mt-4">
            No tienes acceso a ningún módulo
          </div>
        )}
      </div>

      {/* ABAJO - LOGOUT */}
      <div className="pt-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all flex items-center gap-2"
        >
          <span>🚪</span>
          <span>Cerrar sesión</span>
        </button>
      </div>
    </aside>
  );
}