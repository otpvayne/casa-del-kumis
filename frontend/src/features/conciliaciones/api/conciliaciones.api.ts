import { api } from "../../../lib/api";
import type {
  GenerarConciliacionInput,
  GenerarConciliacionResponse,
  ConciliacionResumenResponse,
} from "../types";

const BASE = "/conciliaciones";

export async function generarConciliacion(
  payload: GenerarConciliacionInput
): Promise<GenerarConciliacionResponse> {
  const { data } = await api.post(`${BASE}/generar`, payload);
  return data;
}

export async function fetchConciliacionResumen(
  id: number | string
): Promise<ConciliacionResumenResponse> {
  const { data } = await api.get(`${BASE}/${id}/resumen`);
  return data;
}
