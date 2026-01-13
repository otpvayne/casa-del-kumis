import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { fetchVoucherById } from "../api/vouchers.api";
import VoucherStatusBadge from "../components/VoucherStatusBadge";
import type { VoucherDetail } from "../types";

export default function VoucherDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<VoucherDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    try {
      setErr("");
      setLoading(true);
      const v = await fetchVoucherById(id!);
      setData(v);
    } catch (e: any) {
      setErr(e?.message ?? "Error cargando voucher");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [id]);

  if (loading) return <p className="text-white/60">Cargando...</p>;
  if (err) return <p className="text-red-300">{err}</p>;
  if (!data) return <p className="text-white/60">No data</p>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Voucher #{data.id}</h1>
          <p className="text-white/60 text-sm mt-1">
            {new Date(data.fecha_operacion).toLocaleDateString()} · {data.sucursales?.nombre ?? data.sucursal_id}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <VoucherStatusBadge estado={data.estado} />
          <Link className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-sm" to="/vouchers">
            Volver
          </Link>
        </div>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-white/10 p-4">
          <p className="text-white/60 text-xs">Total VISA</p>
          <p className="text-lg font-semibold">${Number(data.total_visa).toLocaleString("es-CO")}</p>
        </div>
        <div className="rounded-2xl border border-white/10 p-4">
          <p className="text-white/60 text-xs">Total MASTERCARD</p>
          <p className="text-lg font-semibold">${Number(data.total_mastercard).toLocaleString("es-CO")}</p>
        </div>
        <div className="rounded-2xl border border-white/10 p-4">
          <p className="text-white/60 text-xs">Total GLOBAL</p>
          <p className="text-lg font-semibold">${Number(data.total_global).toLocaleString("es-CO")}</p>
        </div>
      </div>

      {/* Imágenes */}
      <div className="rounded-2xl border border-white/10 p-4">
        <h2 className="text-lg font-semibold mb-3">Imágenes</h2>
        {data.voucher_imagenes?.length ? (
          <ul className="space-y-2 text-sm text-white/70">
            {data.voucher_imagenes
              .slice()
              .sort((a, b) => a.orden - b.orden)
              .map((img) => (
                <li key={img.id} className="flex items-center justify-between">
                  <span>Orden #{img.orden}</span>
                  <span className="text-white/40 truncate max-w-[60%]">{img.ruta_imagen}</span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="text-white/60 text-sm">Sin imágenes aún.</p>
        )}
      </div>

      {/* Transacciones */}
      <div className="rounded-2xl border border-white/10 p-4 overflow-x-auto">
        <h2 className="text-lg font-semibold mb-3">Transacciones</h2>

        {data.voucher_transacciones?.length ? (
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr className="text-left">
                <th className="py-2">Franquicia</th>
                <th className="py-2">Recibo</th>
                <th className="py-2">Últimos</th>
                <th className="py-2">Monto</th>
              </tr>
            </thead>
            <tbody>
              {data.voucher_transacciones.map((t) => (
                <tr key={t.id} className="border-t border-white/10">
                  <td className="py-2">{t.franquicia}</td>
                  <td className="py-2">{t.numero_recibo ?? "-"}</td>
                  <td className="py-2">{t.ultimos_digitos ?? "-"}</td>
                  <td className="py-2">${Number(t.monto).toLocaleString("es-CO")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-white/60 text-sm">Sin transacciones.</p>
        )}
      </div>
    </div>
  );
}
