import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { deleteRedeBanFile } from "../api/redeban.api";
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

export default function RedeBanTable({ items, onDeleted }: { 
  items: RedeBanFile[];
  onDeleted: () => void;
}) {
  const nav = useNavigate();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(file: RedeBanFile) {
    const confirm = window.confirm(
      `¿Estás seguro de eliminar este archivo?\n\n` +
      `📄 ${file.nombre_original}\n` +
      `📅 ${fmtDate(file.fecha_conciliacion)}\n` +
      `📊 ${file._count?.registros_redeban ?? 0} registros\n\n` +
      `Esta acción NO se puede deshacer.`
    );

    if (!confirm) return;

    try {
      setDeleting(file.id);
      await deleteRedeBanFile(file.id);
      alert(`✅ Archivo eliminado correctamente:\n${file.nombre_original}`);
      onDeleted(); // Refrescar lista
    } catch (err: any) {
      console.error('Error eliminando archivo:', err);
      const msg = err?.response?.data?.message ?? err?.message ?? "Error desconocido";
      alert(`❌ Error al eliminar: ${msg}`);
    } finally {
      setDeleting(null);
    }
  }

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
            items.map((f) => {
              const isDeleting = deleting === f.id;
              
              return (
                <tr 
                  key={f.id} 
                  className={`border-t border-white/10 transition ${
                    isDeleting ? 'opacity-50' : 'hover:bg-white/5'
                  }`}
                >
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
                  <td className="p-3">
                    <div className="flex gap-2 justify-end">
                      <button
                        className="px-3 py-1 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => nav(`/redeban/${f.id}`)}
                        disabled={isDeleting}
                      >
                        Ver detalle
                      </button>
                      <button
                        className="px-3 py-1 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={() => handleDelete(f)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? 'Eliminando...' : 'Eliminar'}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}