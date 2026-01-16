import { useLocation, Link } from "react-router-dom";

type LocationState = {
  rol?: string;
  allowed?: string[];
};

export default function UnauthorizedPage() {
  const location = useLocation();
  const state = location.state as LocationState;

  const rol = state?.rol ?? "desconocido";
  const allowed = state?.allowed ?? [];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-3xl font-bold text-red-500">Acceso no autorizado</h1>

      <p className="text-sm opacity-80">
        Tu rol actual es: <b>{rol}</b>
      </p>

      {allowed.length > 0 && (
        <p className="text-sm">
          Esta sección es solo para:{" "}
          <b>{allowed.join(", ")}</b>
        </p>
      )}

      {/* Mensajes personalizados */}
      {rol === "OPERATIVO" && (
        <p className="text-yellow-400">
          Este módulo requiere aprobación administrativa.
        </p>
      )}

      {rol === "SOPORTE" && (
        <p className="text-blue-400">
          Tu rol solo tiene acceso de consulta.
        </p>
      )}

      <Link
        to="/dashboard"
        className="mt-4 px-4 py-2 rounded bg-white/10 hover:bg-white/20"
      >
        Volver al dashboard
      </Link>
    </div>
  );
}
