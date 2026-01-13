import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import VoucherStatusBadge from "../components/VoucherStatusBadge";
import UploadImagesModal from "../components/UploadImagesModal";
import { fetchVouchers } from "../api/vouchers.api";
import type { VoucherListItem } from "../types";

export default function VouchersListPage() {
  const [items, setItems] = useState<VoucherListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [uploadFor, setUploadFor] = useState<number | null>(null);
  const nav = useNavigate();

  async function load() {
    try {
      setErr("");
      setLoading(true);
      const data = await fetchVouchers();
      setItems(data);
    } catch (e: any) {
      setErr(e?.message ?? "Error cargando vouchers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Vouchers</h1>
        <button className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15" onClick={load}>
          Refrescar
        </button>
      </div>

      {loading && <p className="mt-6 text-white/60">Cargando...</p>}
      {err && <p className="mt-6 text-red-300">{err}</p>}

      {!loading && !err && (
        <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
          <table className="w-full text-sm">
            <thead className="bg-white/5">
              <tr className="text-left text-white/70">
                <th className="p-3">ID</th>
                <th className="p-3">Fecha</th>
                <th className="p-3">Sucursal</th>
                <th className="p-3">Estado</th>
                <th className="p-3">Total</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => (
                <tr key={v.id} className="border-t border-white/10 hover:bg-white/5">
                  <td className="p-3">{v.id}</td>
                  <td className="p-3">{new Date(v.fecha_operacion).toLocaleDateString()}</td>
                  <td className="p-3">{v.sucursales?.nombre ?? v.sucursal_id}</td>
                  <td className="p-3"><VoucherStatusBadge estado={v.estado} /></td>
                  <td className="p-3">
                    ${Number(v.total_global).toLocaleString("es-CO")}
                  </td>
                  <td className="p-3 flex gap-2 justify-end">
                    <button
                      className="px-3 py-1 rounded-lg bg-white/10 hover:bg-white/15"
                      onClick={() => nav(`/vouchers/${v.id}`)}
                    >
                      Ver detalle
                    </button>
                    <button
                      className="px-3 py-1 rounded-lg bg-white text-black font-semibold"
                      onClick={() => setUploadFor(Number(v.id))}
                    >
                      Subir imágenes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UploadImagesModal
        open={uploadFor !== null}
        onClose={() => setUploadFor(null)}
        voucherId={uploadFor ?? 0}
        onUploaded={load}
      />
    </div>
  );
}
