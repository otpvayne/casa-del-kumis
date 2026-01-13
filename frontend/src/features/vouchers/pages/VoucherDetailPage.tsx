import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../../lib/api"; // ajusta si tu api está en otra ruta

type VoucherTx = {
  id: string;
  franquicia: "VISA" | "MASTERCARD";
  ultimos_digitos: string | null;
  numero_recibo: string | null;
  monto: string; // viene como string por BigInt serialize
};

type VoucherImagen = {
  id: string;
  ruta_imagen: string;
  orden: number;
};

type Voucher = {
  id: string;
  sucursal_id: string;
  fecha_operacion: string;
  estado: string;
  total_visa: string | null;
  total_mastercard: string | null;
  total_global: string | null;
  precision_ocr: string | null;
  voucher_transacciones: VoucherTx[];
  voucher_imagenes: VoucherImagen[];
  sucursales?: {
    nombre: string;
    direccion: string;
  };
};

function badgeClass(estado: string) {
  const e = (estado || "").toUpperCase();
  if (e.includes("CONFIRM")) return "bg-emerald-500/15 text-emerald-300 border-emerald-500/25";
  if (e.includes("BORRADOR") || e.includes("DRAFT")) return "bg-sky-500/15 text-sky-300 border-sky-500/25";
  if (e.includes("PENDIENTE")) return "bg-amber-500/15 text-amber-300 border-amber-500/25";
  return "bg-white/10 text-white/70 border-white/15";
}

// Convierte "C:\...\backend\uploads\vouchers\2025-...\img.jpg" -> "http://localhost:3000/uploads/vouchers/..."
function toPublicUploadUrl(ruta: string) {
  const normalized = ruta.replaceAll("\\", "/");
  const idx = normalized.toLowerCase().indexOf("/uploads/");
  if (idx === -1) return null;
  const publicPath = normalized.slice(idx); // /uploads/...
  return `http://localhost:3000${publicPath}`;
}

function formatCOP(value: string | number | null | undefined) {
  if (value == null) return "—";
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("es-CO");
}

export default function VoucherDetailPage() {
  const { id } = useParams();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const { data } = await api.get(`/vouchers/${id}`);
        if (mounted) setVoucher(data);
      } catch (e: any) {
        if (mounted) setErr(e?.response?.data?.message ?? "Error cargando voucher");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    run();
    return () => {
      mounted = false;
    };
  }, [id]);

  const orderedImages = useMemo(() => {
    const imgs = voucher?.voucher_imagenes ?? [];
    return [...imgs].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
  }, [voucher]);

  if (loading) return <div className="text-white/70">Cargando...</div>;
  if (err) return <div className="text-red-300">Error: {err}</div>;
  if (!voucher) return <div className="text-white/70">No encontrado</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Voucher #{voucher.id}</h1>
          <p className="text-white/60 text-sm mt-1">
            Sucursal: <span className="text-white/80">{voucher.sucursales?.nombre ?? voucher.sucursal_id}</span>
            {voucher.sucursales?.direccion ? (
              <span className="text-white/40"> · {voucher.sucursales.direccion}</span>
            ) : null}
          </p>
        </div>

        <span
          className={[
            "inline-flex items-center px-3 py-1 rounded-full border text-xs font-medium",
            badgeClass(voucher.estado),
          ].join(" ")}
        >
          {voucher.estado}
        </span>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card label="Fecha operación" value={new Date(voucher.fecha_operacion).toLocaleDateString("es-CO")} />
        <Card label="Total Mastercard" value={`$ ${formatCOP(voucher.total_mastercard)}`} />
        <Card label="Total Visa" value={`$ ${formatCOP(voucher.total_visa)}`} />
        <Card label="Gran total" value={`$ ${formatCOP(voucher.total_global)}`} />
      </div>

      {/* Imágenes */}
      <section className="bg-white/5 border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Imágenes</h2>
          {/* Por ahora solo UI, luego conectamos el botón a upload multi-imagen */}
          <button
            className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 border border-white/10 text-sm"
            onClick={() => alert("Luego conectamos esto al endpoint POST /vouchers/:id/imagenes")}
          >
            Subir imagen
          </button>
        </div>

        {orderedImages.length === 0 ? (
          <p className="text-white/60 text-sm mt-3">Este voucher no tiene imágenes aún.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {orderedImages.map((img) => {
              const url = toPublicUploadUrl(img.ruta_imagen);
              return (
                <div key={img.id} className="rounded-xl overflow-hidden border border-white/10 bg-black/20">
                  {url ? (
                    <img src={url} className="w-full h-44 object-cover" alt={`Voucher img ${img.orden}`} />
                  ) : (
                    <div className="h-44 flex items-center justify-center text-xs text-white/60 p-2">
                      No se pudo convertir ruta a URL pública
                    </div>
                  )}
                  <div className="p-2 text-xs text-white/60 flex justify-between">
                    <span>Orden: {img.orden}</span>
                    <span>ID: {img.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Transacciones */}
      <section className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h2 className="font-semibold">Transacciones</h2>

        {(voucher.voucher_transacciones?.length ?? 0) === 0 ? (
          <p className="text-white/60 text-sm mt-3">No hay transacciones detectadas aún.</p>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead className="text-white/60">
                <tr className="border-b border-white/10">
                  <th className="text-left py-2">Franquicia</th>
                  <th className="text-left py-2">Últimos 4</th>
                  <th className="text-left py-2">Recibo</th>
                  <th className="text-right py-2">Monto</th>
                </tr>
              </thead>
              <tbody>
                {voucher.voucher_transacciones.map((t) => (
                  <tr key={t.id} className="border-b border-white/5">
                    <td className="py-2">{t.franquicia}</td>
                    <td className="py-2">{t.ultimos_digitos ?? "—"}</td>
                    <td className="py-2">{t.numero_recibo ?? "—"}</td>
                    <td className="py-2 text-right">$ {formatCOP(t.monto)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-white/60 text-xs">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}
