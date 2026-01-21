import { useEffect, useState } from "react";
import { generarConciliacion } from "../api/conciliaciones.api";
import type { GenerarConciliacionResponse } from "../types";
import { useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";

type Sucursal = {
  id: string;
  nombre: string;
  codigo_comercio_redeban?: string;
};

async function fetchSucursales(): Promise<Sucursal[]> {
  const { data } = await api.get("/sucursales");
  return data;
}

export default function ConciliacionGenerateCard({
  onGenerated,
}: {
  onGenerated: (res: GenerarConciliacionResponse) => void;
}) {
  const nav = useNavigate();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loadingSuc, setLoadingSuc] = useState(true);
  const [errorSuc, setErrorSuc] = useState("");

  const [sucursalId, setSucursalId] = useState<number | "">("");
  const [fechaVentas, setFechaVentas] = useState("");
  const [force, setForce] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        setLoadingSuc(true);
        setErrorSuc("");
        const list = await fetchSucursales();
        setSucursales(list);
      } catch (e: any) {
        console.error("Error cargando sucursales:", e);
        setErrorSuc(
          e?.response?.data?.message ?? e?.message ?? "Error cargando sucursales"
        );
        setSucursales([]);
      } finally {
        setLoadingSuc(false);
      }
    })();
  }, []);

  async function handleGenerate() {
    setError("");

    // Validaciones
    if (!sucursalId) {
      setError("⚠️ Debes seleccionar una sucursal");
      return;
    }

    if (!fechaVentas) {
      setError("⚠️ Debes seleccionar una fecha de ventas");
      return;
    }

    // Validar que la fecha no sea futura
    const selected = new Date(fechaVentas);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selected > today) {
      setError("⚠️ La fecha de ventas no puede ser futura");
      return;
    }

    // Validar que la fecha no sea muy antigua (más de 1 año)
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    if (selected < oneYearAgo) {
      const confirm = window.confirm(
        "⚠️ La fecha seleccionada es mayor a 1 año. ¿Estás seguro?"
      );
      if (!confirm) return;
    }

    try {
      setLoading(true);
      const res = await generarConciliacion({
        sucursalId: Number(sucursalId),
        fechaVentas,
        force,
      });

      onGenerated(res);

      // Mostrar resumen rápido
      alert(
        `✅ Conciliación generada correctamente\n\n` +
          `ID: ${res.conciliacion.id}\n` +
          `Total Voucher: $${res.resumen.totalGlobalVoucher.toLocaleString("es-CO")}\n` +
          `Total Banco: $${res.resumen.totalBancoAjustado.toLocaleString("es-CO")}\n` +
          `Diferencia: $${res.resumen.diferenciaCalculada.toLocaleString("es-CO")}\n\n` +
          `Match OK: ${res.resumen.matchStats.matchOk}\n` +
          `Sin Banco: ${res.resumen.matchStats.sinBanco}\n` +
          `Sin Voucher: ${res.resumen.matchStats.sinVoucher}`
      );

      // Navegar al resumen
      nav(`/conciliaciones/${res.conciliacion.id}/resumen`);
    } catch (err: any) {
      console.error("Error generando conciliación:", err);
      const msg =
        err?.response?.data?.message ?? err?.message ?? "Error desconocido";
      setError(`❌ ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-lg">⚙️ Generar Conciliación</h2>
        <p className="text-sm text-white/60 mt-1">
          Genera una conciliación diaria comparando Voucher vs Banco vs RedeBan.
        </p>
      </div>

      {/* Error de sucursales */}
      {errorSuc && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-300">{errorSuc}</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sucursal */}
        <div>
          <label className="block text-sm text-white/80 mb-2">
            Sucursal <span className="text-red-400">*</span>
          </label>
          <select
            value={sucursalId}
            onChange={(e) => {
              setSucursalId(e.target.value ? Number(e.target.value) : "");
              setError("");
            }}
            disabled={loadingSuc || loading}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value="">
              {loadingSuc ? "Cargando..." : "Selecciona una sucursal"}
            </option>
            {sucursales.map((s) => (
              <option key={s.id} value={Number(s.id)}>
                {s.nombre}
                {s.codigo_comercio_redeban &&
                  ` (${s.codigo_comercio_redeban})`}
              </option>
            ))}
          </select>
          {sucursales.length === 0 && !loadingSuc && (
            <p className="text-xs text-amber-400 mt-1">
              ⚠️ No hay sucursales disponibles
            </p>
          )}
        </div>

        {/* Fecha */}
        <div>
          <label className="block text-sm text-white/80 mb-2">
            Fecha de Ventas <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={fechaVentas}
            onChange={(e) => {
              setFechaVentas(e.target.value);
              setError("");
            }}
            max={new Date().toISOString().split("T")[0]}
            disabled={loading}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-white/40 mt-1">
            Fecha que aparece en el voucher y archivos banco
          </p>
        </div>

        {/* Force */}
        <div className="flex flex-col justify-center">
          <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
            <input
              type="checkbox"
              checked={force}
              onChange={(e) => setForce(e.target.checked)}
              disabled={loading}
              className="w-4 h-4 rounded border-white/10 bg-white/5 text-sky-500 focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50"
            />
            <span>Forzar recálculo (force)</span>
          </label>
          <p className="text-xs text-white/40 mt-1 ml-6">
            Regenera aunque ya exista
          </p>
        </div>
      </div>

      {/* Error general */}
      {error && (
        <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Info adicional */}
      <div className="px-4 py-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
        <p className="text-xs text-sky-300">
          <b>ℹ️ Importante:</b> El voucher debe estar CONFIRMADO. El sistema
          usa <b>fecha_vale</b> para Banco y <b>fecha_conciliacion</b> para
          RedeBan.
        </p>
      </div>

      {/* Botones */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={loading || loadingSuc || !sucursalId || !fechaVentas}
          className="px-6 py-3 rounded-lg bg-sky-500 text-black font-semibold hover:bg-sky-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generando...
            </span>
          ) : (
            "🚀 Generar Conciliación"
          )}
        </button>

        {!force && (
          <p className="text-sm text-white/50">
            Tip: Si ya existe, marca <b>force</b> para recalcular
          </p>
        )}
      </div>
    </div>
  );
}