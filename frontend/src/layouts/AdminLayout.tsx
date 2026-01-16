import { Outlet, Link, useNavigate } from "react-router-dom";
import { logout } from "../lib/auth"; // ajusta el path si es necesario

export default function AdminLayout() {
  const navigate = useNavigate();

  function handleLogout() {
    if (!confirm("¿Deseas cerrar sesión?")) return;
    logout();
    navigate("/login"); // ajusta si tu ruta de login es otra
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 p-4 border-r border-white/10 flex flex-col">
        <div>
          <h2 className="text-lg font-semibold mb-4">Casa del Kumis</h2>

          <nav className="flex flex-col gap-3 mt-6 text-sm">
            <Link className="hover:text-white" to="/dashboard">Dashboard</Link>
            <Link className="hover:text-white" to="/vouchers">Vouchers</Link>
            <Link className="hover:text-white" to="/conciliaciones">Conciliaciones</Link>
            <Link className="hover:text-white" to="/redeban">RedeBan</Link>
            <Link className="hover:text-white" to="/banco">Banco</Link>
            <Link className="hover:text-white" to="/sucursales">Sucursales</Link>
            <Link className="hover:text-white" to="/users">Usuarios</Link>
            <Link className="hover:text-white" to="/logs">Logs</Link>
            <Link className="hover:text-white" to="/parametros">Parámetros</Link>
          </nav>
        </div>

        {/* BOTÓN CERRAR SESIÓN */}
        <button
          onClick={handleLogout}
          className="mt-auto text-left text-sm text-red-400 hover:text-red-300 border-t border-white/10 pt-4"
        >
          ⛔ Cerrar sesión
        </button>
      </aside>

      {/* Contenido */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
