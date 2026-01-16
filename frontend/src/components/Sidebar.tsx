import { NavLink, useNavigate } from "react-router-dom";
import { navItems } from "../routes/routeConfig";
import { useAuth } from "../auth/useAuth";
import { logout } from "../auth/auth";

export function Sidebar() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = user?.rol;

  // Filtrar menú según rol
  const items = navItems.filter((i) => !role || i.roles.includes(role));

  function handleLogout() {
    if (!confirm("¿Cerrar sesión?")) return;

    logout(); // elimina token
    navigate("/login", { replace: true });
  }

  return (
    <aside className="w-64 border-r border-white/10 bg-black/20 p-4 flex flex-col justify-between">
      {/* ARRIBA */}
      <div>
        {/* INFO USUARIO */}
        <div className="mb-6">
          <div className="text-lg font-semibold">
            {user?.nombre ?? "Casa del Kumis"}
          </div>
          <div className="text-xs text-white/60">
            Rol: {user?.rol ?? "—"}
          </div>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex flex-col gap-1">
          {items.map((i) => (
            <NavLink
              key={i.to}
              to={i.to}
              className={({ isActive }) =>
                [
                  "rounded-lg px-3 py-2 text-sm transition",
                  isActive
                    ? "bg-white/10 text-white"
                    : "hover:bg-white/5 text-white/80",
                ].join(" ")
              }
            >
              {i.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* ABAJO */}
      <div className="pt-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition"
        >
          🚪 Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
