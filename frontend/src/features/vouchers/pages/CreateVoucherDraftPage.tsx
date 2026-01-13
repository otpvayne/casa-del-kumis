import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createVoucherDraft } from "../api/vouchers.api";

export default function CreateVoucherDraftPage() {
  const nav = useNavigate();
  const [sucursalId, setSucursalId] = useState<number>(8); // pon default real
  const [fechaOperacion, setFechaOperacion] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleCreate() {
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
          <label className="text-sm text-white/70">Sucursal ID</label>
          <input
            type="number"
            className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2"
            value={sucursalId}
            onChange={(e) => setSucursalId(Number(e.target.value))}
          />
        </div>

        <div>
          <label className="text-sm text-white/70">Fecha operación</label>
          <input
            type="date"
            className="mt-1 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2"
            value={fechaOperacion}
            onChange={(e) => setFechaOperacion(e.target.value)}
          />
        </div>

        {err && <div className="text-sm text-red-300">{err}</div>}

        <button
          className="px-4 py-2 rounded-xl bg-white text-black font-semibold disabled:opacity-60"
          onClick={handleCreate}
          disabled={loading || !fechaOperacion}
        >
          {loading ? "Creando..." : "Crear borrador"}
        </button>
      </div>
    </div>
  );
}
