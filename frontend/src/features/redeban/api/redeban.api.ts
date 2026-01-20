import { api } from "../../../lib/api";
import type { RedeBanFile, RedeBanDetail } from "../types";

const BASE = "/redeban";

export async function fetchRedeBanFiles(): Promise<RedeBanFile[]> {
  const { data } = await api.get(BASE);
  return data;
}

export async function fetchRedeBanFile(id: number | string): Promise<RedeBanDetail> {
  const { data } = await api.get(`${BASE}/${id}`);
  return data;
}

export async function uploadRedeBanFile(
  file: File, 
  fechaConciliacion: string // ← Agregar parámetro
): Promise<RedeBanFile> {
  const form = new FormData();
  form.append("file", file);
  form.append("fechaConciliacion", fechaConciliacion); // ← Agregar al FormData

  const { data } = await api.post(`${BASE}/upload`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}