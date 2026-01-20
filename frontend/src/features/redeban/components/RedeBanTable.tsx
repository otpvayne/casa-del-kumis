import { useNavigate } from "react-router-dom";
import type { RedeBanFile } from "../types";

function fmtDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-CO", {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return "—";
  }
}

export default function RedeBanTable({ items }: { items: RedeBanFile[] }) {
  const nav = useNavigate();

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02]">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-white/70">
          <tr>
            <th className="p-3 text-left">Archivo</th>
            <th className="p-3 text-left">Fecha Conciliación</th>
            <th className="p-3 text-left">Estado</th>
            <th className="p-3 text-left">Registros</th>
            <th className="p-3 text-left">Cargado</th>
            <th className="p-3 text-right">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 ? (
            <tr>
              <td className="p-12 text-center text-white/40" colSpan={6}>
                No hay archivos RedeBan cargados.
              </td>
            </tr>
          ) : (
            items.map((f) => (
              <tr key={f.id} className="border-t border-white/10 hover:bg-white/5 transition">
                <td className="p-3">
                  <div>
                    <p className="font-medium">{f.nombre_original}</p>
                    <p className="text-xs text-white/40 mt-1">ID: {f.id}</p>
                  </div>
                </td>
                <td className="p-3 text-white/70">{fmtDate(f.fecha_conciliacion)}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    f.estado === 'PROCESADO'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : f.estado === 'ERROR'
                      ? 'bg-red-500/20 text-red-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {f.estado}
                  </span>
                </td>
                <td className="p-3 text-sky-400 font-semibold">
                  {f._count?.registros_redeban ?? "—"}
                </td>
                <td className="p-3 text-white/60 text-xs">{fmtDate(f.created_at)}</td>
                <td className="p-3 text-right">
                  <button
                    className="px-3 py-1 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 text-xs font-medium transition"
                    onClick={() => nav(`/redeban/${f.id}`)}
                  >
                    Ver detalle
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}