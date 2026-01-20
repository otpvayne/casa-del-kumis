import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchRedeBanFile } from "../api/redeban.api";
import type { RedeBanDetail } from "../types";

function formatMoney(n: string | number) {
  const num = typeof n === "string" ? parseFloat(n) : n;
  return `$${Number(num ?? 0).toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function RedeBanDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<RedeBanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetchRedeBanFile(id); // id string OK
      setData(res);
    } catch (err: any) {
      console.error("Error cargando RedeBan:", err);
      setError(err?.response?.data?.message ?? err?.message ?? "Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const registros = data?.registros_redeban ?? [];

  const totals = useMemo(() => {
    const totalRegistros = registros.length;
    const totalValorBruto = registros.reduce(
      (sum, r) => sum + parseFloat(r.valor_bruto || "0"),
      0
    );
    const totalNeto = registros.reduce(
      (sum, r) => sum + parseFloat(r.neto || "0"),
      0
    );
    const totalComision = registros.reduce(
      (sum, r) => sum + parseFloat(r.comision || "0"),
      0
    );
    return { totalRegistros, totalValorBruto, totalNeto, totalComision };
  }, [registros]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
          <p className="text-white/60">Cargando detalles de RedeBan...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link className="text-sky-300 hover:text-sky-200" to="/redeban">
          ← Volver a RedeBan
        </Link>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-300">⚠️ {error || "No se encontraron datos"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">RedeBan #{data.id}</h1>
          <p className="text-sm text-white/60 mt-1">{data.nombre_original}</p>
        </div>

        <Link className="text-sm text-sky-300 hover:text-sky-200" to="/redeban">
          ← Volver
        </Link>
      </div>

      {/* Cards Totales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card label="Total registros" value={String(totals.totalRegistros)} />
        <Card label="Valor Bruto Total" value={formatMoney(totals.totalValorBruto)} accent="sky" />
        <Card label="Comisión Total" value={formatMoney(totals.totalComision)} accent="amber" />
        <Card label="Neto Total" value={formatMoney(totals.totalNeto)} accent="emerald" />
      </div>

      {/* Fecha y Estado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card label="Fecha de Conciliación" value={formatDate(data.fecha_conciliacion)} />
        <Card
          label="Estado"
          value={data.estado}
          accent={data.estado === "PROCESADO" ? "emerald" : data.estado === "ERROR" ? "red" : "amber"}
        />
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-lg font-semibold">
            Registros por Sucursal ({totals.totalRegistros})
          </h2>
        </div>

        {registros.length === 0 ? (
          <div className="p-12 text-center text-white/40">
            No hay registros para este archivo RedeBan
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 text-white/70">
                <tr>
                  <th className="p-3 text-left">Código Comercio</th>
                  <th className="p-3 text-left">Dirección</th>
                  <th className="p-3 text-right">Cant. Trans.</th>
                  <th className="p-3 text-right">Valor Bruto</th>
                  <th className="p-3 text-right">Base Liquid.</th>
                  <th className="p-3 text-right">Comisión</th>
                  <th className="p-3 text-right">Neto</th>
                </tr>
              </thead>

              <tbody>
                {registros.map((r, idx) => (
                  <tr
                    key={r.id ?? String(idx)}
                    className="border-t border-white/10 hover:bg-white/5 transition"
                  >
                    <td className="p-3 font-mono text-sky-400">{r.codigo_comercio}</td>
                    <td className="p-3 text-white/70 text-xs">{r.direccion || "—"}</td>
                    <td className="p-3 text-right font-semibold">{r.cantidad_transacciones}</td>
                    <td className="p-3 text-right">{formatMoney(r.valor_bruto)}</td>
                    <td className="p-3 text-right text-sky-400">{formatMoney(r.base_liquidacion)}</td>
                    <td className="p-3 text-right text-amber-400">{formatMoney(r.comision)}</td>
                    <td className="p-3 text-right font-semibold text-emerald-400">{formatMoney(r.neto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "sky" | "emerald" | "amber" | "red";
}) {
  const cls =
    accent === "sky"
      ? "text-sky-300"
      : accent === "emerald"
      ? "text-emerald-300"
      : accent === "amber"
      ? "text-amber-300"
      : accent === "red"
      ? "text-red-300"
      : "text-white";

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-white/60 text-xs">{label}</p>
      <p className={`text-lg font-semibold ${cls}`}>{value}</p>
    </div>
  );
}
