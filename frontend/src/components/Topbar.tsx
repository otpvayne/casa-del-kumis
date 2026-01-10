import { useAuth } from "../auth/useAuth";

export function Topbar() {
  const { user, logout } = useAuth();

  return (
    <header className="flex items-center justify-between border-b border-white/10 px-6 py-4">
      <div className="text-sm text-white/70">
        Sesión: <span className="text-white">{user?.email}</span> · Rol:{" "}
        <span className="text-white">{user?.rol}</span>
      </div>

      <button
        onClick={logout}
        className="rounded-lg border border-white/10 px-3 py-2 text-sm hover:bg-white/5"
      >
        Cerrar sesión
      </button>
    </header>
  );
}
