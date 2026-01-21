import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { fetchConciliacionResumen } from "../api/conciliaciones.api";
import type { ConciliacionResumenResponse } from "../types";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Resumen Conciliación #{id}</h1>
          <p className="text-sm text-white/60 mt-1">
            Conteo por estado + casos SIN_BANCO / SIN_VOUCHER + top diferencias de comisión.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link className="text-sm text-sky-300 hover:text-sky-200" to="/conciliaciones">
            ← Volver
          </Link>
          <button
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm"
            onClick={load}
          >
            Refrescar
          </button>
        </div>
      </div>

      {loading && <p className="text-white/60">Cargando...</p>}
      {err && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-red-300">
          ⚠️ {err}
        </div>
      )}

      {!loading && !err && data && (
        <>
          {/* Conteo por estado */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm font-semibold mb-3">Conteo por estado</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(data.conteoPorEstado || {}).map(([k, v]) => (
                <span key={k} className="px-2 py-1 rounded-lg text-xs bg-white/10 text-white/80">
                  {k}: <b className="text-white">{v}</b>
                </span>
              ))}
            </div>

            <div className="mt-3 text-xs text-white/50">
              causa principal: <b>{data.conciliacion?.causa_principal ?? "—"}</b>
            </div>
          </div>

          <ConciliacionResumenLists
            sinBanco={data.sinBanco || []}
            sinVoucher={data.sinVoucher || []}
            topDiffComision={data.topDiffComision || []}
          />
        </>
      )}
    </div>
  );
}
