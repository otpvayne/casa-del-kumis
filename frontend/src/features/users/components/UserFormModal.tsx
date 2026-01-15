import { useState } from "react";
import { createUser, updateUser } from "../api/users.api";
import type { User } from "../types";

export default function UserFormModal({
  user,
  onClose,
  onSaved,
}: {
  user: User | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState(user?.nombre ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [rol, setRol] = useState(user?.rol ?? "OPERATIVO");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* =======================
     VALIDACIONES
  ======================= */
  const nombreValido = nombre.trim().length >= 3;
  const emailValido = email.includes("@");
  const passwordValido = user ? true : password.length >= 6;

  const formValido =
    nombreValido &&
    emailValido &&
    passwordValido &&
    rol.length > 0;

  /* =======================
     SUBMIT
  ======================= */
  async function handleSubmit() {
    if (!formValido || loading) return;

    try {
      setLoading(true);
      setError(null);

      if (user) {
        await updateUser(user.id, {
          nombre,
          email,
          rol,
        });
      } else {
        await createUser({
          nombre,
          email,
          password,
          rol,
        });
      }

      onSaved();
      onClose();
    } catch (err: any) {
      const msg =
        err.response?.data?.message?.[0] ??
        "Error al guardar el usuario";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-neutral-900 border border-white/10 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-lg font-semibold">
          {user ? "Editar usuario" : "Crear usuario"}
        </h2>

        {/* ERROR GLOBAL */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm p-2 rounded">
            {error}
          </div>
        )}

        {/* NOMBRE */}
        <div>
          <input
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full bg-transparent border border-white/10 rounded px-3 py-2"
          />
          {!nombreValido && nombre.length > 0 && (
            <p className="text-xs text-red-400 mt-1">
              El nombre debe tener al menos 3 caracteres
            </p>
          )}
        </div>

        {/* EMAIL */}
        <div>
          <input
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-transparent border border-white/10 rounded px-3 py-2"
          />
          {!emailValido && email.length > 0 && (
            <p className="text-xs text-red-400 mt-1">
              Ingresa un correo válido
            </p>
          )}
        </div>

        {/* PASSWORD (SOLO CREAR) */}
        {!user && (
          <div>
            <input
              type="password"
              placeholder="Contraseña (mínimo 6 caracteres)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border border-white/10 rounded px-3 py-2"
            />
            {!passwordValido && password.length > 0 && (
              <p className="text-xs text-red-400 mt-1">
                La contraseña debe tener mínimo 6 caracteres
              </p>
            )}
          </div>
        )}

        {/* ROL */}
        <div>
          <select
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            className="w-full bg-transparent border border-white/10 rounded px-3 py-2"
          >
            <option value="ADMIN">ADMIN</option>
            <option value="OPERATIVO">OPERATIVO</option>
            <option value="SOPORTE">SOPORTE</option>
          </select>
          <p className="text-xs text-white/40 mt-1">
            Define el nivel de acceso del usuario
          </p>
        </div>

        {/* ACTIONS */}
        <div className="flex justify-end gap-2 pt-4">
          <button
            onClick={onClose}
            className="px-3 py-2 text-white/60"
            disabled={loading}
          >
            Cancelar
          </button>

          <button
            onClick={handleSubmit}
            disabled={!formValido || loading}
            className={`px-4 py-2 rounded font-semibold ${
              formValido
                ? "bg-sky-500 text-black"
                : "bg-sky-500/30 text-black/40 cursor-not-allowed"
            }`}
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
