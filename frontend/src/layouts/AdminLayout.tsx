import { Outlet, Link } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="min-h-screen flex">
      {/* Sidebar simple (luego lo mejoramos) */}
      <aside className="w-64 p-4 border-r border-white/10">
        <h2 className="text-lg font-semibold mb-4">Casa del Kumis</h2>
        <nav className="space-y-2">
  <Link to="/dashboard">Dashboard</Link>
  <Link to="/vouchers">Vouchers</Link>
  <Link to="/conciliaciones">Conciliaciones</Link>
  <Link to="/redeban">RedeBan</Link>
  <Link to="/banco">Banco</Link>
  <Link to="/sucursales">Sucursales</Link>
  <Link to="/users">Usuarios</Link>
  <Link to="/parametros-sistema">Parámetros</Link>
</nav>

      </aside>

      {/* Contenido */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
