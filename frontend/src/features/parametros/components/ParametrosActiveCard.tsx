import type { ParametrosSistema } from "../types";

function fmtPct(n: string) {
  const num = Number(n ?? 0);
  return `${(num * 100).toFixed(2)}%`;
}

export default function ParametrosActiveCard({ active }: { active: ParametrosSistema | null }) {
  if (!active) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <p className="text-white/60">No hay parámetros activos.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-emerald-200"> Parámetros activos</h2>
          <p className="text-sm text-white/60 mt-1">ID: {active.id}</p>
        </div>

        <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-200">
          ACTIVO
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">Tasa comisión</p>
          <p className="text-xl font-semibold text-white mt-1">{fmtPct(active.tasa_comision)}</p>
          <p className="text-xs text-white/40 mt-1">({active.tasa_comision})</p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">Margen error permitido</p>
          <p className="text-xl font-semibold text-white mt-1">
            ${Number(active.margen_error_permitido ?? 0).toLocaleString("es-CO")}
          </p>
        </div>

        <div className="rounded-lg border border-white/10 bg-white/5 p-4">
          <p className="text-xs text-white/60">Días desfase banco</p>
          <p className="text-xl font-semibold text-white mt-1">{active.dias_desfase_banco}</p>
        </div>
      </div>
    </div>
  );
}
