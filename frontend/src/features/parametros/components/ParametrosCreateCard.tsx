import { useState } from "react";
import { createParametros } from "../api/parametros.api";

export default function ParametrosCreateCard({ onCreated }: { onCreated: () => void }) {
  const [saving, setSaving] = useState(false);

  // defaults “seguros”
  const [tasa, setTasa] = useState("0.012");
  const [margen, setMargen] = useState("50");
  const [desfase, setDesfase] = useState("1");

  async function handleCreate() {
    const tasaNum = Number(tasa);
    const margenNum = Number(margen);
    const desfaseNum = Number(desfase);

    if (!Number.isFinite(tasaNum) || tasaNum <= 0 || tasaNum > 1) {
      alert("⚠️ tasa_comision debe ser un número entre 0 y 1 (ej: 0.012)");
      return;
    }
    if (!Number.isFinite(margenNum) || margenNum < 0) {
      alert("⚠️ margen_error_permitido inválido");
      return;
    }
    if (!Number.isInteger(desfaseNum) || desfaseNum < 0 || desfaseNum > 30) {
      alert("⚠️ dias_desfase_banco debe ser entero (0-30)");
      return;
    }

    try {
      setSaving(true);
      await createParametros({
        tasa_comision: tasaNum,
        margen_error_permitido: margenNum,
        dias_desfase_banco: desfaseNum,
      });
      alert("✅ Parámetros creados");
      onCreated();
    } catch (e: any) {
      alert(`❌ Error creando: ${e?.response?.data?.message ?? e?.message ?? "Error"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <h2 className="text-lg font-semibold"> Crear nuevos parámetros</h2>
      <p className="text-sm text-white/60 mt-1">
        Crea una nueva versión. Luego puedes activarla desde la tabla.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
        <div>
          <label className="block text-xs text-white/60 mb-2">Tasa comisión (0-1)</label>
          <input
            value={tasa}
            onChange={(e) => setTasa(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            placeholder="0.012"
          />
          <p className="text-xs text-white/40 mt-2">Ej: 0.012 = 1.2%</p>
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-2">Margen error permitido (COP)</label>
          <input
            value={margen}
            onChange={(e) => setMargen(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            placeholder="50"
          />
        </div>

        <div>
          <label className="block text-xs text-white/60 mb-2">Días desfase banco</label>
          <input
            value={desfase}
            onChange={(e) => setDesfase(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-black/20 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-sky-500/40"
            placeholder="1"
          />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={handleCreate}
          disabled={saving}
          className="px-6 py-3 rounded-lg bg-sky-500 text-black font-semibold hover:bg-sky-400 transition disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Crear"}
        </button>
        <p className="text-xs text-white/40">
          Tip: después de crear, activa la versión correcta.
        </p>
      </div>
    </div>
  );
}
