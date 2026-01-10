import type { VoucherEstado } from "../types";

export default function VoucherStatusBadge({ estado }: { estado: VoucherEstado }) {
  const base = "inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold border";

  const map: Record<VoucherEstado, string> = {
    BORRADOR: "border-white/15 text-white/70 bg-white/5",
    PENDIENTE_CONFIRMACION: "border-yellow-500/30 text-yellow-200 bg-yellow-500/10",
    CONFIRMADO: "border-emerald-500/30 text-emerald-200 bg-emerald-500/10",
  };

  return <span className={`${base} ${map[estado]}`}>{estado}</span>;
}
