import { useEffect, useState } from "react";
import { fetchUsers, deactivateUser } from "../api/users.api";
import type { User } from "../types";
import UserFormModal from "../components/UserFormModal";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  async function loadUsers() {
    setLoading(true);
    const data = await fetchUsers();
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => {
    loadUsers();
  }, []);

  if (loading) return <p className="text-white/60">Cargando usuarios…</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Usuarios</h1>
        <button
          onClick={() => {
            setEditingUser(null);
            setModalOpen(true);
          }}
          className="px-4 py-2 rounded-xl bg-sky-500 text-black font-semibold"
        >
          ➕ Crear usuario
        </button>
      </div>

      <table className="w-full text-sm border border-white/10 rounded-xl overflow-hidden">
        <thead className="bg-white/5 text-white/60">
          <tr>
            <th className="text-left p-3">Nombre</th>
            <th className="text-left p-3">Email</th>
            <th className="text-left p-3">Rol</th>
            <th className="text-left p-3">Estado</th>
            <th className="p-3"></th>
          </tr>
        </thead>

        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-white/10">
              <td className="p-3">{u.nombre}</td>
              <td className="p-3">{u.email}</td>
              <td className="p-3">{u.rol}</td>
              <td className="p-3">
                <span
                  className={`px-2 py-1 rounded text-xs ${
                    u.estado === "ACTIVO"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-red-500/20 text-red-300"
                  }`}
                >
                  {u.estado}
                </span>
              </td>
              <td className="p-3 text-right space-x-2">
                <button
                  onClick={() => {
                    setEditingUser(u);
                    setModalOpen(true);
                  }}
                  className="text-sky-400 hover:text-sky-300"
                >
                  Editar
                </button>

                {u.estado === "ACTIVO" && (
                  <button
                    onClick={async () => {
                      if (!confirm("¿Desactivar usuario?")) return;
                      await deactivateUser(u.id);
                      loadUsers();
                    }}
                    className="text-red-400 hover:text-red-300"
                  >
                    Desactivar
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {modalOpen && (
        <UserFormModal
          user={editingUser}
          onClose={() => setModalOpen(false)}
          onSaved={loadUsers}
        />
      )}
    </div>
  );
}
