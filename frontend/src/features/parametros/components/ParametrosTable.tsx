import type { ParametrosSistema } from "../types";
import { activateParametros } from "../api/parametros.api";

function fmtPct(n: string) {
  const num = Number(n ?? 0);
  return `${(num * 100).toFixed(2)}%`;
}

export default function ParametrosTable({
  items,
  onChange,
}: {
  items: ParametrosSistema[];
  onChange: () => void;
}) {
  async function handleActivate(id: string) {
    const ok = confirm(`¿Activar parámetros #${id}? Esto afectará conciliaciones nuevas.`);
    if (!ok) return;

    try {
      await activateParametros(id);
      alert("✅ Parámetros activados");
      onChange();
    } catch (e: any) {
      alert(`❌ Error activando: ${e?.response?.data?.message ?? e?.message ?? "Error"}`);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02]">
      <table className="w-full text-sm">
        <thead className="bg-white/5 text-white/70">
          <tr>
            <th className="p-3 text-left">ID</th>
            <th className="p-3 text-left">Tasa</th>
            <th className="p-3 text-left">Margen</th>
            <th className="p-3 text-left">Desfase</th>
            <th className="p-3 text-left">Estado</th>
            <th className="p-3 text-right">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={6} className="p-12 text-center text-white/40">
                No hay parámetros creados.
              </td>
            </tr>
          ) : (
            items.map((p) => (
              <tr key={p.id} className="border-t border-white/10 hover:bg-white/5 transition">
                <td className="p-3 font-mono text-sky-300">{p.id}</td>
                <td className="p-3 text-white/70">
                  {fmtPct(p.tasa_comision)} <span className="text-white/40">({p.tasa_comision})</span>
                </td>
                <td className="p-3 text-white/70">
                  ${Number(p.margen_error_permitido ?? 0).toLocaleString("es-CO")}
                </td>
                <td className="p-3 text-white/70">{p.dias_desfase_banco}</td>
                <td className="p-3">
                  {p.activo ? (
                    <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-emerald-500/20 text-emerald-300">
                      ACTIVO
                    </span>
                  ) : (
                    <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-white/10 text-white/60">
                      INACTIVO
                    </span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <button
                    disabled={p.activo}
                    onClick={() => handleActivate(p.id)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold transition
                      bg-sky-500/20 text-sky-300 hover:bg-sky-500/30
                      disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Activar
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
