import { api } from "../../../lib/api";
import type {
  GenerarConciliacionInput,
  GenerarConciliacionResponse,
  ConciliacionResumenResponse,
  Conciliacion,
} from "../types";

const BASE = "/conciliaciones";

/**
 * Genera una nueva conciliación
 */
export async function generarConciliacion(
  payload: GenerarConciliacionInput
): Promise<GenerarConciliacionResponse> {
  try {
    const { data } = await api.post(`${BASE}/generar`, payload);
    return data;
  } catch (error: any) {
    console.error("Error generando conciliación:", error);
    throw error;
  }
}

/**
 * Obtiene el resumen de una conciliación específica
 */
export async function fetchConciliacionResumen(
  id: number | string
): Promise<ConciliacionResumenResponse> {
  try {
    const { data } = await api.get(`${BASE}/${id}/resumen`);
    return data;
  } catch (error: any) {
    console.error(`Error obteniendo resumen de conciliación ${id}:`, error);
    throw error;
  }
}

/**
 * Lista todas las conciliaciones
 */
export async function fetchConciliaciones(): Promise<Conciliacion[]> {
  try {
    const { data } = await api.get(BASE);
    return data;
  } catch (error: any) {
    console.error("Error obteniendo conciliaciones:", error);
    throw error;
  }
}

/**
 * Obtiene una conciliación por ID
 */
export async function fetchConciliacion(
  id: number | string
): Promise<Conciliacion> {
  try {
    const { data } = await api.get(`${BASE}/${id}`);
    return data;
  } catch (error: any) {
    console.error(`Error obteniendo conciliación ${id}:`, error);
    throw error;
  }
}

/**
 * Elimina una conciliación
 */
export async function deleteConciliacion(
  id: number | string
): Promise<{ ok: boolean; deletedId: string }> {
  try {
    const { data } = await api.delete(`${BASE}/${id}`);
    return data;
  } catch (error: any) {
    console.error(`Error eliminando conciliación ${id}:`, error);
    throw error;
  }
}

/**
 * Exporta una conciliación a Excel (si el backend lo soporta)
 */
export async function exportConciliacion(
  id: number | string
): Promise<Blob> {
  try {
    const { data } = await api.get(`${BASE}/${id}/export`, {
      responseType: "blob",
    });
    return data;
  } catch (error: any) {
    console.error(`Error exportando conciliación ${id}:`, error);
    throw error;
  }
}