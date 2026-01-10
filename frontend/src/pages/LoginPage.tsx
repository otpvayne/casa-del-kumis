import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { setToken } from "../lib/auth";

type LoginResponse = {
  access_token: string; // ajusta si tu backend usa otro nombre
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

      if (!data?.accessToken) throw new Error("No llegó access_token");

      setToken(data.accessToken);
      nav("/", { replace: true });
    } catch (err: any) {
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
    <div className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-xl border p-6 space-y-4"
      >
        <h1 className="text-2xl font-bold">Casa del Kumis • Admin</h1>

        <div className="space-y-2">
          <label className="text-sm">Email</label>
          <input
            className="w-full border rounded-lg p-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm">Contraseña</label>
          <input
            className="w-full border rounded-lg p-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && (
          <div className="text-sm border rounded-lg p-2">
            {error}
          </div>
        )}

        <button
          disabled={loading}
          className="w-full rounded-lg border p-2 font-semibold"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
