import { Link } from "react-router-dom";

export default function ConciliacionHeader() {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold">Conciliaciones</h1>
        <p className="text-sm text-white/60 mt-1">
          Genera conciliación diaria (Voucher vs Banco vs RedeBan) y revisa el resumen por estados.
        </p>
      </div>

      <Link className="text-sm text-sky-300 hover:text-sky-200" to="/dashboard">
        ← Volver al dashboard
      </Link>
    </div>
  );
}
