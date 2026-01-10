import { Outlet, Link } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar simple (luego lo mejoramos) */}
      <aside className="w-64 p-4 border-r border-white/10">
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


      </aside>

      {/* Contenido */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
