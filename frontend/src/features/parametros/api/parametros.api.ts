import { api } from "../../../lib/api";
import type { ParametrosSistema, CreateParametrosPayload } from "../types";

const BASE = "/parametros-sistema";

export async function fetchParametrosAll(): Promise<ParametrosSistema[]> {
  const { data } = await api.get(BASE);
  return data;
}

export async function fetchParametrosActive(): Promise<ParametrosSistema> {
  const { data } = await api.get(`${BASE}/active`);
  return data;
}

export async function createParametros(payload: CreateParametrosPayload): Promise<ParametrosSistema> {
  const { data } = await api.post(BASE, payload);
  return data;
}

export async function activateParametros(id: number | string): Promise<{ ok: boolean; activeId?: string }> {
  const { data } = await api.post(`${BASE}/${id}/activate`);
  return data;
}
