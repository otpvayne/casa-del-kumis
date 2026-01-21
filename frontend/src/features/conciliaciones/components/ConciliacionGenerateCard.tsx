import { useEffect, useState } from "react";
import { generarConciliacion } from "../api/conciliaciones.api";
import type { GenerarConciliacionResponse } from "../types";
import { useNavigate } from "react-router-dom";
import { api } from "../../../lib/api";

type Sucursal = {
  id: string;
  nombre: string;
};

async function fetchSucursales(): Promise<Sucursal[]> {
  const { data } = await api.get("/sucursales"); // ajusta si tu base es distinta
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

  const [sucursalId, setSucursalId] = useState<number | "">("");
  const [fechaVentas, setFechaVentas] = useState("");
  const [force, setForce] = useState(false);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoadingSuc(true);
        const list = await fetchSucursales();
        setSucursales(list);
      } catch (e) {
        console.error(e);
        setSucursales([]);
      } finally {
        setLoadingSuc(false);
      }
    })();
  }, []);

  async function handleGenerate() {
    if (!sucursalId || !fechaVentas) {
      alert("⚠️ Selecciona sucursal y fecha de ventas");
      return;
    }

    try {
      setLoading(true);
      const res = await generarConciliacion({
        sucursalId: Number(sucursalId),
        fechaVentas,
        force,
      });

      onGenerated(res);

      // te llevo al resumen automáticamente
      nav(`/conciliaciones/${res.conciliacion.id}/resumen`);
    } catch (err: any) {
      console.error(err);
      alert(
        `❌ Error generando conciliación: ${
          err?.response?.data?.message ?? err?.message ?? "Error"
        }`
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-lg">⚙️ Generar conciliación</h2>
        <p className="text-sm text-white/60 mt-1">
          El voucher debe estar <b>CONFIRMADO</b>. Banco usa <b>fecha_vale</b>. RedeBan usa <b>fecha_conciliacion</b>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sucursal */}
        <div>
          <label className="block text-sm text-white/80 mb-2">Sucursal</label>
          <select
            value={sucursalId}
            onChange={(e) => setSucursalId(e.target.value ? Number(e.target.value) : "")}
            disabled={loadingSuc}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          >
            <option value="">
              {loadingSuc ? "Cargando..." : "Selecciona una sucursal"}
            </option>
            {sucursales.map((s) => (
              <option key={s.id} value={Number(s.id)}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Fecha */}
        <div>
          <label className="block text-sm text-white/80 mb-2">Fecha de ventas</label>
          <input
            type="date"
            value={fechaVentas}
            onChange={(e) => setFechaVentas(e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>

        {/* Force */}
        <div className="flex items-end">
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={force}
              onChange={(e) => setForce(e.target.checked)}
            />
            Recalcular (force)
          </label>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={loading || loadingSuc}
          className="px-6 py-3 rounded-lg bg-sky-500 text-black font-semibold hover:bg-sky-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Generando..." : "Generar conciliación"}
        </button>

        <p className="text-sm text-white/50">
          Tip: si ya existía, puedes recalcular marcando <b>force</b>.
        </p>
      </div>
    </div>
  );
}
