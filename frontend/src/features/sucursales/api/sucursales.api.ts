import { api } from "../../../lib/api";
import type { Sucursal } from "../types/sucursal.types";

// GET /sucursales - Listar todas
export const getSucursales = async (): Promise<Sucursal[]> => {
  const { data } = await api.get("/sucursales");
  return data;
};

// GET /sucursales/:id - Obtener una por ID
export const getSucursalById = async (id: number): Promise<Sucursal> => {
  const { data } = await api.get(`/sucursales/${id}`);
  return data;
};

// POST /sucursales - Crear nueva
export const createSucursal = async (
  payload: Omit<Sucursal, "id" | "created_at" | "updated_at">
): Promise<Sucursal> => {
  const { data } = await api.post("/sucursales", payload);
  return data;
};

// PATCH /sucursales/:id - Actualizar (✅ Cambiado de PUT a PATCH)
export const updateSucursal = async (
  id: number,
  payload: Partial<Omit<Sucursal, "id" | "created_at" | "updated_at">>
): Promise<Sucursal> => {
  const { data } = await api.patch(`/sucursales/${id}`, payload);
  return data;
};

// PATCH /sucursales/:id/deactivate - Desactivar (✅ NUEVO)
export const deactivateSucursal = async (id: number): Promise<Sucursal> => {
  const { data } = await api.patch(`/sucursales/${id}/deactivate`);
  return data;
};

// DELETE /sucursales/:id - Eliminar (si existe en tu backend)
export const deleteSucursal = async (id: number): Promise<void> => {
  await api.delete(`/sucursales/${id}`);
};