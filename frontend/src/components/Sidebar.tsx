import { NavLink } from "react-router-dom";
import { navItems } from "../routes/routeConfig";
import { useAuth } from "../auth/useAuth"; // ajusta al path real

export function Sidebar() {
  const { user } = useAuth();
  const role = user?.rol;

  const items = navItems.filter((i) => !role || i.roles.includes(role));

  return (
    <aside className="w-64 border-r border-white/10 bg-black/20 p-4">
      <div className="mb-6">
        <div className="text-lg font-semibold">Casa del Kumis</div>
        <div className="text-xs text-white/60">Admin</div>
      </div>

      <nav className="flex flex-col gap-1">
        {items.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            className={({ isActive }) =>
              [
                "rounded-lg px-3 py-2 text-sm",
                isActive ? "bg-white/10" : "hover:bg-white/5",
              ].join(" ")
            }
          >
            {i.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
