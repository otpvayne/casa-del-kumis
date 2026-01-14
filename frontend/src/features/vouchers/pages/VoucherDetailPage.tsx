import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../../../lib/api";
import VoucherImageViewer from "../components/VoucherImageViewer";
import {
  uploadVoucherImage,
  confirmVoucher,
  deleteVoucherImage,
  reorderVoucherImages,
  autosaveVoucherDraft,
  fetchVoucherAudit,
  
} from "../api/vouchers.api";

/* =======================
   TYPES
======================= */
type VoucherTx = {
  id: string;
  franquicia: "VISA" | "MASTERCARD";
  ultimos_digitos: string | null;
  numero_recibo: string | null;
  monto: string;
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
  estado: "DRAFT" | "CONFIRMADO";
  total_visa: string | null;
  total_mastercard: string | null;
  total_global: string | null;
  voucher_transacciones: VoucherTx[];
  voucher_imagenes: VoucherImagen[];
  sucursales?: {
    nombre: string;
    direccion: string;
  };
};

/* =======================
   HELPERS
======================= */
function badgeClass(estado: string) {
  return estado === "CONFIRMADO"
    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
    : "bg-sky-500/15 text-sky-300 border-sky-500/30";
}

function toPublicUploadUrl(ruta: string) {
  const normalized = ruta.replaceAll("\\", "/");
  const idx = normalized.indexOf("/uploads/");
  if (idx === -1) return null;
  return `http://localhost:3000${normalized.slice(idx)}`;
}

function formatCOP(v: string | number | null) {
  if (!v) return "—";
  return Number(v).toLocaleString("es-CO");
}

/* =======================
   COMPONENT
======================= */
export default function VoucherDetailPage() {
  const { id } = useParams();
  const [voucher, setVoucher] = useState<Voucher | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const isLocked = voucher?.estado === "CONFIRMADO";
  const fileInputId = "voucher-upload-input";

  /* =======================
     LOAD
  ======================= */
  async function loadVoucher() {
    const { data } = await api.get(`/vouchers/${id}`);
    setVoucher(data);
  }

  useEffect(() => {
    loadVoucher().finally(() => setLoading(false));
  }, [id]);

  /* =======================
     AUTOSAVE (DRAFT)
  ======================= */
  useEffect(() => {
    if (!voucher || voucher.estado !== "DRAFT") return;

    const timeout = setTimeout(async () => {
      try {
        setSaving(true);
        await updateVoucherDraft(Number(voucher.id), {
          totalVisa: Number(voucher.total_visa) || undefined,
          totalMastercard: Number(voucher.total_mastercard) || undefined,
          totalGlobal: Number(voucher.total_global) || undefined,
          transacciones: voucher.voucher_transacciones,
        });
      } catch (e) {
        console.error("Autosave error", e);
      } finally {
        setSaving(false);
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [voucher]);

  /* =======================
     CONFIRM
  ======================= */
  async function handleConfirm() {
    if (!voucher) return;
    if (!confirm("¿Confirmar este voucher?\n\nNo podrá editarse.")) return;

    try {
      setConfirming(true);
      await confirmVoucher(voucher.id, {
        totalVisa: voucher.total_visa ?? undefined,
        totalMastercard: voucher.total_mastercard ?? undefined,
        totalGlobal: voucher.total_global ?? undefined,
      });
      await loadVoucher();
    } finally {
      setConfirming(false);
    }
  }

  /* =======================
     CALCULATIONS
  ======================= */
  const calculatedTotal = useMemo(() => {
    return (
      voucher?.voucher_transacciones.reduce(
        (sum, t) => sum + Number(t.monto || 0),
        0
      ) ?? 0
    );
  }, [voucher]);

  if (loading) return <p className="text-white/60">Cargando...</p>;
  if (!voucher) return <p className="text-red-400">Voucher no encontrado</p>;

  const orderedImages = [...voucher.voucher_imagenes].sort(
    (a, b) => a.orden - b.orden
  );

  return (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-100px)]">

    {/* IZQUIERDA – INFO */}
    <div className="lg:col-span-2 space-y-6 overflow-y-auto pr-2">

      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-semibold">Voucher #{voucher.id}</h1>
          <p className="text-white/60 text-sm">
            {voucher.sucursales?.nombre}
          </p>

          {!isLocked && (
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="mt-3 px-4 py-2 rounded-xl bg-emerald-500 text-black font-semibold"
            >
              {confirming ? "Confirmando..." : "Confirmar voucher"}
            </button>
          )}

          {saving && (
            <p className="text-xs text-white/40 mt-1">
              Guardando cambios…
            </p>
          )}
        </div>

        <span
          className={`px-3 py-1 rounded-full border text-xs ${badgeClass(
            voucher.estado
          )}`}
        >
          {voucher.estado}
        </span>
      </div>

      {/* TOTALES */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card label="Fecha" value={voucher.fecha_operacion} />
        <EditableCard
          label="Total Visa"
          value={voucher.total_visa}
          disabled={isLocked}
          onChange={(v) =>
            setVoucher({ ...voucher, total_visa: v })
          }
        />
        <EditableCard
          label="Total Mastercard"
          value={voucher.total_mastercard}
          disabled={isLocked}
          onChange={(v) =>
            setVoucher({ ...voucher, total_mastercard: v })
          }
        />
        <EditableCard
          label="Gran total"
          value={voucher.total_global}
          disabled={isLocked}
          onChange={(v) =>
            setVoucher({ ...voucher, total_global: v })
          }
        />
      </div>

      {Number(voucher.total_global) !== calculatedTotal && (
        <p className="text-red-400 text-sm">
          ⚠️ Descuadre: transacciones ${formatCOP(calculatedTotal)}
        </p>
      )}

      {/* TRANSACCIONES */}
      <section className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h2 className="font-semibold mb-3">Transacciones</h2>

        <table className="w-full text-sm">
          <thead className="text-white/60">
            <tr>
              <th>Franquicia</th>
              <th>Recibo</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            {voucher.voucher_transacciones.map((t) => (
              <tr key={t.id}>
                <td>{t.franquicia}</td>
                <td>{t.numero_recibo ?? "—"}</td>
                <td>
                  <input
                    disabled={isLocked}
                    value={t.monto}
                    className="bg-transparent border border-white/10 rounded px-2 py-1 w-24"
                    onChange={(e) => {
                      const value = e.target.value;
                      setVoucher({
                        ...voucher,
                        voucher_transacciones:
                          voucher.voucher_transacciones.map((tx) =>
                            tx.id === t.id
                              ? { ...tx, monto: value }
                              : tx
                          ),
                      });
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>

    {/* DERECHA – IMAGEN FIJA */}
    <div className="lg:col-span-1 sticky top-6 h-[calc(100vh-120px)] overflow-y-auto">
      <div className="bg-white/5 border border-white/10 rounded-xl p-4">
        <h2 className="font-semibold mb-3">Voucher</h2>

        <VoucherImageViewer images={voucher.voucher_imagenes} />
      </div>
    </div>

  </div>
);
}

/* =======================
   UI COMPONENTS
======================= */
function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-white/60 text-xs">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function EditableCard({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string | null;
  disabled: boolean;
  onChange: (v: string) => void;
}) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <p className="text-white/60 text-xs">{label}</p>

      <input
        type="text"
        disabled={disabled}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 bg-transparent border border-white/10 rounded px-2 py-1 w-full"
      />
    </div>
  );
}
