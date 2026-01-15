import { useEffect, useState } from "react";
import {
  fetchUsers,
  deactivateUser,
  activateUser,
  deleteUser,
} from "../api/users.api";
import type { User } from "../types";
import UserFormModal from "../components/UserFormModal";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Usuario logueado
  const currentUser: User | null = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  })();

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
      {/* HEADER */}
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
<div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-300">
  ⚠️ <strong>Nota:</strong> Si realizas cambios y no los ves reflejados de inmediato,
  presiona <strong>F5</strong> en tu teclado para actualizar la información.
</div>

      {/* TABLE */}
      <table className="w-full text-sm border border-white/10 rounded-xl overflow-hidden">
        <thead className="bg-white/5 text-white/60">
          <tr>
            <th className="text-left p-3">Nombre</th>
            <th className="text-left p-3">Email</th>
            <th className="text-left p-3">Rol</th>
            <th className="text-left p-3">Estado</th>
            <th className="p-3 text-right">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {users.map((u) => {
            const isSelf = currentUser?.id === u.id;

            return (
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

                <td className="p-3 text-right space-x-3">
                  {/* EDITAR */}
                  <button
                    onClick={() => {
                      setEditingUser(u);
                      setModalOpen(true);
                    }}
                    className="text-sky-400 hover:text-sky-300"
                  >
                    Editar
                  </button>

                  {/* ACTIVAR / DESACTIVAR */}
                  {u.estado === "ACTIVO" ? (
                    <button
                      onClick={async () => {
                        if (!confirm("¿Desactivar este usuario?")) return;

                        const updated = await deactivateUser(u.id);

                        setUsers((prev) =>
                          prev.map((user) =>
                            user.id === u.id ? updated : user
                          )
                        );
                      }}
                      className="text-yellow-400 hover:text-yellow-300"
                    >
                      Desactivar
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        if (!confirm("¿Activar este usuario?")) return;

                        const updated = await activateUser(u.id);

                        setUsers((prev) =>
                          prev.map((user) =>
                            user.id === u.id ? updated : user
                          )
                        );
                      }}
                      className="text-emerald-400 hover:text-emerald-300"
                    >
                      Activar
                    </button>
                  )}

                  {/* ELIMINAR */}
                  <button
                    disabled={isSelf}
                    onClick={async () => {
                      if (isSelf) return;

                      const ok = confirm(
                        "⚠️ ELIMINAR USUARIO\n\nEsta acción NO se puede deshacer.\n¿Continuar?"
                      );
                      if (!ok) return;

                      await deleteUser(u.id);
                      setUsers((prev) =>
                        prev.filter((user) => user.id !== u.id)
                      );
                    }}
                    className={`${
                      isSelf
                        ? "text-white/30 cursor-not-allowed"
                        : "text-red-500 hover:text-red-400"
                    }`}
                    title={
                      isSelf
                        ? "No puedes eliminar tu propio usuario"
                        : "Eliminar usuario"
                    }
                  >
                    Eliminar
                  </button>
                </td>
              </tr>
            );
          })}
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
