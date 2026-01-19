import { api } from "../../../lib/api";
import type { VoucherDetail, VoucherListItem } from "../types";

// Tipo para sucursales
export interface Sucursal {
  id: number;
  nombre: string;
  codigo_comercio_redeban: string;
  codigo_referencia_banco: string;
  direccion: string;
  estado: string;
}

// ✅ Usar el endpoint /activas en lugar de /sucursales
export async function fetchSucursales(): Promise<Sucursal[]> {
  const { data } = await api.get("/sucursales/activas");
  return data;
}

// =======================
// VOUCHERS
// =======================

export async function fetchVouchers(params?: {
  estado?: string;
  sucursalId?: number;
  fecha?: string; // YYYY-MM-DD
}) {
  const res = await api.get<VoucherListItem[]>("/vouchers", { params });
  return res.data;
}

export async function fetchVoucherById(id: string | number) {
  const res = await api.get<VoucherDetail>(`/vouchers/${id}`);
  return res.data;
}

export async function uploadVoucherImage(
  voucherId: number,
  file: File,
  orden?: number
) {
  const form = new FormData();

  // 🔥 CLAVE: debe llamarse "image"
  form.append("image", file);

  if (orden !== undefined) {
    form.append("orden", String(orden));
  }

  const res = await api.post(
    `/vouchers/${voucherId}/imagenes`,
    form
    // ❌ NO pongas headers
  );

  return res.data;
}


export async function createVoucherDraft(input: {
  sucursalId: number;
  fechaOperacion: string; // YYYY-MM-DD
}) {
  const res = await api.post("/vouchers/draft", input);
  return res.data;
}

export async function confirmVoucher(
  id: number,
  body: { totalVisa?: number; totalMastercard?: number; totalGlobal?: number; observacion?: string },
) {
  const res = await api.post(`/vouchers/${id}/confirm`, body);
  return res.data;
}

// =======================
// IMÁGENES
// =======================

export async function deleteVoucherImage(
  voucherId: number,
  imageId: number
) {
  const res = await api.delete(
    `/vouchers/${voucherId}/imagenes/${imageId}`
  );
  return res.data;
}

export async function reorderVoucherImages(
  voucherId: number,
  ordenes: { id: number; orden: number }[]
) {
  const res = await api.patch(
    `/vouchers/${voucherId}/imagenes/reorder`,
    { ordenes }
  );
  return res.data;
}

// =======================
// AUTOSAVE DRAFT
// =======================

export async function autosaveVoucherDraft(
  voucherId: number,
  body: {
    totalVisa?: string;
    totalMastercard?: string;
    totalGlobal?: string;
    transacciones?: {
      id: string;
      monto: string;
    }[];
  }
) {
  const res = await api.patch(`/vouchers/${voucherId}/draft`, body);
  return res.data;
}

// =======================
// AUDITORÍA / HISTORIAL
// =======================

export async function fetchVoucherAudit(voucherId: number) {
  const res = await api.get(
    `/vouchers/${voucherId}/audit`
  );
  return res.data;
}

// =======================
// DELETE
// =======================

export async function deleteVoucher(voucherId: number) {
  try {
    const res = await api.delete(`/vouchers/${voucherId}`);
    return res.data;
  } catch (error: any) {
    console.error("Error eliminando voucher:", error);
    console.error("Response data:", error.response?.data);
    console.error("Headers enviados:", error.config?.headers);
    throw error;
  }
}