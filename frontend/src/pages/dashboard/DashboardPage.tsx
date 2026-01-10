import { getUserFromToken } from "../../lib/auth";

export default function DashboardPage() {
  const user = getUserFromToken();

  return (
    <div className="p-6 space-y-2">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="text-sm">Sesión: {user?.email ?? "N/A"} • Rol: {user?.rol ?? "N/A"}</p>
    </div>
  );
}
