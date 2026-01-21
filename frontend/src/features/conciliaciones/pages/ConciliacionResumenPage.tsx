import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchConciliacionResumen } from "../api/conciliaciones.api";
import type { ConciliacionResumenResponse } from "../types";
import ConciliacionResumenCards from "../components/ConciliacionResumenCards";
import ConciliacionResumenLists from "../components/ConciliacionResumenLists";

export default function ConciliacionResumenPage() {
  const { id } = useParams();
  const [data, setData] = useState<ConciliacionResumenResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    if (!id) return;
    try {
      setErr("");
      setLoading(true);
      const res = await fetchConciliacionResumen(id);
      setData(res);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? "Error cargando resumen");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500 mx-auto mb-4"></div>
          <p className="text-white/60">Cargando resumen de conciliación...</p>
        </div>
      </div>
    );
  }

  if (err || !data) {
    return (
      <div className="space-y-4">
        <Link className="text-sky-300 hover:text-sky-200" to="/conciliaciones">
          ← Volver a Conciliaciones
        </Link>
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
          <p className="text-red-300">⚠️ {err || "No se encontraron datos"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">
            Resumen Conciliación #{id}
          </h1>
          <p className="text-sm text-white/60 mt-1">
            {data.conciliacion.sucursal_nombre} • {" "}
            {new Date(data.conciliacion.fecha_ventas).toLocaleDateString("es-CO", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link 
            className="text-sm text-sky-300 hover:text-sky-200" 
            to="/conciliaciones"
          >
            ← Volver
          </Link>
          <button
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm transition"
            onClick={load}
          >
            🔄 Refrescar
          </button>
        </div>
      </div>

      {/* Estado y Causa Principal */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-xs text-white/60">Estado:</span>
              <span className={`ml-2 px-3 py-1 rounded-lg text-sm font-medium ${
                data.conciliacion.estado === 'FINALIZADO' || data.conciliacion.estado === 'GENERADA'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : data.conciliacion.estado === 'ERROR'
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}>
                {data.conciliacion.estado}
              </span>
            </div>
            <div className="h-8 w-px bg-white/10"></div>
            <div>
              <span className="text-xs text-white/60">Causa principal:</span>
              <span className="ml-2 text-sm font-medium text-white">
                {data.conciliacion.causa_principal || "—"}
              </span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xs text-white/60">Creada</div>
            <div className="text-sm text-white/80">
              {new Date(data.conciliacion.created_at!).toLocaleDateString("es-CO", {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Cards con métricas mejoradas */}
      <ConciliacionResumenCards resumen={data} />

      {/* Conteo por estado */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold mb-3">📊 Conteo por Estado</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(data.conteo_por_estado || {}).map(([k, v]) => (
            <span 
              key={k} 
              className={`px-3 py-1 rounded-lg text-xs font-medium ${
                k === 'MATCH_OK' || k === 'ABONO_DIA_SIGUIENTE'
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : k === 'SIN_BANCO' || k === 'SIN_VOUCHER'
                  ? 'bg-red-500/20 text-red-300'
                  : 'bg-amber-500/20 text-amber-300'
              }`}
            >
              {k}: <b>{v as number}</b>
            </span>
          ))}
        </div>
      </div>

      {/* Listas de problemas */}
      <ConciliacionResumenLists
        sinBanco={data.sin_banco || []}
        sinVoucher={data.sin_voucher || []}
        topDiffComision={data.top_diferencias_comision || []}
      />

      {/* Archivos fuente */}
      {data.archivos_fuente && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm font-semibold mb-3">📁 Archivos Fuente</div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-xs text-white/60 mb-1">Voucher</div>
              {data.archivos_fuente.voucher ? (
                <div className="text-white/90">
                  <div>ID: {data.archivos_fuente.voucher.id}</div>
                  <div className="text-xs text-white/60">
                    {new Date(data.archivos_fuente.voucher.fecha_operacion).toLocaleDateString("es-CO")} • {data.archivos_fuente.voucher.estado}
                  </div>
                </div>
              ) : (
                <div className="text-white/40">—</div>
              )}
            </div>
            
            <div>
              <div className="text-xs text-white/60 mb-1">Archivo Banco</div>
              {data.archivos_fuente.archivo_banco ? (
                <div className="text-white/90">
                  <div className="text-xs">{data.archivos_fuente.archivo_banco.nombre}</div>
                  <div className="text-xs text-white/60">ID: {data.archivos_fuente.archivo_banco.id}</div>
                </div>
              ) : (
                <div className="text-white/40">—</div>
              )}
            </div>
            
            <div>
              <div className="text-xs text-white/60 mb-1">Archivo RedeBan</div>
              {data.archivos_fuente.archivo_redeban ? (
                <div className="text-white/90">
                  <div className="text-xs">{data.archivos_fuente.archivo_redeban.nombre}</div>
                  <div className="text-xs text-white/60">ID: {data.archivos_fuente.archivo_redeban.id}</div>
                </div>
              ) : (
                <div className="text-white/40">—</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}