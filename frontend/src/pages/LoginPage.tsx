import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { setToken } from "../lib/auth";

type LoginResponse = {
  accessToken: string;
  user: {
    id: number;
    nombre: string;
    email: string;
    rol: string;
    estado: string;
  };
};

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data } = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });

      console.log("✅ Login response:", data);

      if (!data?.accessToken) throw new Error("No llegó accessToken");

      // Guardar token
      setToken(data.accessToken);

      // Guardar user completo
      localStorage.setItem("user", JSON.stringify(data.user));

      console.log("✅ Token guardado");

      // IMPORTANTE: Usar window.location para forzar recarga completa
      // Esto recargará el AuthProvider con el nuevo token
      window.location.href = "/dashboard";
    } catch (err: any) {
      console.error("❌ Error en login:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo iniciar sesión";
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-gray-900 to-black">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 backdrop-blur-lg p-6 space-y-4"
      >
        <h1 className="text-2xl font-bold text-white">Casa del Kumis • Admin</h1>

        <div className="space-y-2">
          <label className="text-sm text-white/80">Email</label>
          <input
            className="w-full border border-white/10 bg-white/5 rounded-lg p-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@email.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm text-white/80">Contraseña</label>
          <input
            className="w-full border border-white/10 bg-white/5 rounded-lg p-2 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoComplete="current-password"
            required
          />
        </div>

        {error && (
          <div className="text-sm border border-red-500/30 bg-red-500/10 rounded-lg p-3 text-red-400">
            ❌ {error}
          </div>
        )}

        <button
          disabled={loading}
          className="w-full rounded-lg bg-sky-500 hover:bg-sky-600 disabled:bg-sky-500/50 p-3 font-semibold text-white transition"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>

        <p className="text-xs text-white/40 text-center">
          Sistema con control de roles activado
        </p>
      </form>
    </div>
  );
}