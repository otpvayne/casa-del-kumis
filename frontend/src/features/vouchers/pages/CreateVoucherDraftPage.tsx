import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createVoucherDraft, fetchSucursales, type Sucursal } from "../api/vouchers.api";

export default function CreateVoucherDraftPage() {
  const nav = useNavigate();
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [sucursalId, setSucursalId] = useState<number | null>(null);
  const [fechaOperacion, setFechaOperacion] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingSucursales, setLoadingSucursales] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function loadSucursales() {
      try {
        const data = await fetchSucursales();
        setSucursales(data);
        // Opcional: seleccionar la primera sucursal por defecto
        if (data.length > 0) {
          setSucursalId(data[0].id);
        }
      } catch (e: any) {
        setErr("Error cargando sucursales");
        console.error(e);
      } finally {
        setLoadingSucursales(false);
      }
    }
    loadSucursales();
  }, []);

  async function handleCreate() {
    if (!sucursalId) {
      setErr("Debes seleccionar una sucursal");
      return;
    }

    try {
      setErr("");
      setLoading(true);
      const v = await createVoucherDraft({ sucursalId, fechaOperacion });
      nav(`/vouchers/${v.id}`);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? "Error creando borrador");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">Crear voucher (borrador)</h1>
      <p className="text-white/60 text-sm mt-2">
        Crea el voucher sin imágenes y luego le subes las fotos.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm text-white/70 block mb-1">Sucursal</label>
          {loadingSucursales ? (
            <div className="text-sm text-white/60">Cargando sucursales...</div>
          ) : sucursales.length === 0 ? (
            <div className="text-sm text-red-300">No hay sucursales disponibles</div>
          ) : (
            <select
              className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
              value={sucursalId ?? ""}
              onChange={(e) => setSucursalId(Number(e.target.value))}
            >
              <option value="" disabled>Selecciona una sucursal</option>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id} className="bg-gray-900">
                  {s.nombre}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="text-sm text-white/70 block mb-1">Fecha operación</label>
          <input
            type="date"
            className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white"
            value={fechaOperacion}
            onChange={(e) => setFechaOperacion(e.target.value)}
          />
        </div>

        {err && <div className="text-sm text-red-300">{err}</div>}

        <button
          className="px-4 py-2 rounded-xl bg-white text-black font-semibold disabled:opacity-60"
          onClick={handleCreate}
          disabled={loading || !fechaOperacion || !sucursalId || loadingSucursales}
        >
          {loading ? "Creando..." : "Crear borrador"}
        </button>
      </div>
    </div>
  );
}