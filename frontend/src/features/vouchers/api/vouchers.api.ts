import { api } from "../../../lib/api";
import type { VoucherDetail, VoucherListItem } from "../types";

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

export async function createVoucherDraft(payload: { sucursalId: number; fechaOperacion: string }) {
  const res = await api.post("/vouchers/draft", payload);
  return res.data;
}

export async function uploadVoucherImage(voucherId: number, file: File, orden?: number) {
  const form = new FormData();
  form.append("image", file);
  if (orden !== undefined) form.append("orden", String(orden));

  const res = await api.post(`/vouchers/${voucherId}/imagenes`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}
