import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";

type Conciliacion = {
  id: string;
  sucursal_id: string;
  fecha_ventas: string;
  estado: string;
  diferencia_calculada?: string | number | null;
  causa_principal?: string | null;
  created_at: string;
  sucursal?: {
    id: string;
    nombre: string;
  };
  _count?: {
    conciliaciones_transacciones: number;
  };
};

async function fetchConciliaciones(): Promise<Conciliacion[]> {
  const { data } = await api.get("/conciliaciones");
  return data;
}

async function deleteConciliacion(id: string): Promise<void> {
  await api.delete(`/conciliaciones/${id}`);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-CO", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatMoney(n: any) {
  const num = typeof n === "string" ? Number(n) : Number(n ?? 0);
  return `$${num.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function ConciliacionesListPage() {
  const nav = useNavigate();
  const [items, setItems] = useState<Conciliacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    try {
      setError("");
      setLoading(true);
      const data = await fetchConciliaciones();
      setItems(data);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? e?.message ?? "Error cargando conciliaciones"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(item: Conciliacion) {
    const confirm = window.confirm(
      `¿Estás seguro de eliminar esta conciliación?\n\n` +
        `📅 Fecha: ${formatDate(item.fecha_ventas)}\n` +
        `🏢 Sucursal: ${item.sucursal?.nombre ?? "—"}\n` +
        `📊 ${item._count?.conciliaciones_transacciones ?? 0} transacciones\n\n` +
        `Esta acción NO se puede deshacer.`
    );

    if (!confirm) return;

    try {
      setDeleting(item.id);
      await deleteConciliacion(item.id);
      alert("✅ Conciliación eliminada correctamente");
      load();
    } catch (err: any) {
      console.error("Error eliminando:", err);
      const msg =
        err?.response?.data?.message ?? err?.message ?? "Error desconocido";
      alert(`❌ Error al eliminar: ${msg}`);
    } finally {
      setDeleting(null);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Conciliaciones</h1>
          <p className="text-sm text-white/60 mt-1">
            Historial de conciliaciones generadas
          </p>
        </div>

        <div className="flex gap-3">
          <button
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition font-medium text-sm"
            onClick={load}
            disabled={loading}
          >
            {loading ? "Cargando..." : " Refrescar"}
          </button>

          <Link
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 transition font-medium text-sm text-black"
            to="/conciliaciones/generar"
          >
             Nueva Conciliación
          </Link>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500 mx-auto mb-3"></div>
            <p className="text-white/60 text-sm">Cargando conciliaciones...</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-red-300">⚠️ {error}</p>
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/70">
              <tr>
                <th className="p-3 text-left">ID</th>
                <th className="p-3 text-left">Sucursal</th>
                <th className="p-3 text-left">Fecha Ventas</th>
                <th className="p-3 text-left">Estado</th>
                <th className="p-3 text-right">Diferencia</th>
                <th className="p-3 text-left">Causa Principal</th>
                <th className="p-3 text-left">Transacciones</th>
                <th className="p-3 text-left">Creada</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="p-12 text-center text-white/40" colSpan={9}>
                    No hay conciliaciones. Genera una nueva para comenzar.
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isDeleting = deleting === item.id;

                  return (
                    <tr
                      key={item.id}
                      className={`border-t border-white/10 transition ${
                        isDeleting ? "opacity-50" : "hover:bg-white/5"
                      }`}
                    >
                      <td className="p-3 font-mono text-sky-400">
                        #{item.id}
                      </td>
                      <td className="p-3">
                        <div className="font-medium">
                          {item.sucursal?.nombre ?? `ID: ${item.sucursal_id}`}
                        </div>
                      </td>
                      <td className="p-3 text-white/70">
                        {formatDate(item.fecha_ventas)}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-lg text-xs font-medium ${
                            item.estado === "FINALIZADO"
                              ? "bg-emerald-500/20 text-emerald-300"
                              : item.estado === "ERROR"
                              ? "bg-red-500/20 text-red-300"
                              : "bg-amber-500/20 text-amber-300"
                          }`}
                        >
                          {item.estado}
                        </span>
                      </td>
                      <td className="p-3 text-right font-semibold">
                        <span
                          className={
                            Math.abs(Number(item.diferencia_calculada ?? 0)) < 100
                              ? "text-emerald-400"
                              : Math.abs(Number(item.diferencia_calculada ?? 0)) < 1000
                              ? "text-amber-400"
                              : "text-red-400"
                          }
                        >
                          {formatMoney(item.diferencia_calculada)}
                        </span>
                      </td>
                      <td className="p-3 text-white/60 text-xs">
                        {item.causa_principal || "—"}
                      </td>
                      <td className="p-3 text-center text-white/70">
                        {item._count?.conciliaciones_transacciones ?? 0}
                      </td>
                      <td className="p-3 text-white/60 text-xs">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-end">
                          <button
                            className="px-3 py-1 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 text-xs font-medium transition disabled:opacity-50"
                            onClick={() =>
                              nav(`/conciliaciones/${item.id}/resumen`)
                            }
                            disabled={isDeleting}
                          >
                            Ver Resumen
                          </button>
                          <button
                            className="px-3 py-1 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 text-xs font-medium transition disabled:opacity-50"
                            onClick={() => handleDelete(item)}
                            disabled={isDeleting}
                          >
                            {isDeleting ? "..." : "Eliminar"}
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
      )}
    </div>
  );
}