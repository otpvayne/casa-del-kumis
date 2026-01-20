import { api } from "../../../lib/api";
import type { RedeBanFile, RedeBanDetail } from "../types";

const BASE = "/redeban";

export async function fetchRedeBanFiles(): Promise<RedeBanFile[]> {
  try {
    const { data } = await api.get(BASE);
    return data;
  } catch (error: any) {
    console.error('Error fetching RedeBan files:', error);
    throw error;
  }
}

export async function fetchRedeBanFile(id: number | string): Promise<RedeBanDetail> {
  try {
    const { data } = await api.get(`${BASE}/${id}`);
    return data;
  } catch (error: any) {
    console.error(`Error fetching RedeBan file ${id}:`, error);
    throw error;
  }
}

export async function uploadRedeBanFile(
  file: File,
  fechaConciliacion: string
): Promise<RedeBanFile> {
  // Validaciones del lado del cliente
  if (!file) {
    throw new Error('Debes proporcionar un archivo');
  }

  if (!fechaConciliacion) {
    throw new Error('Debes proporcionar una fecha de conciliación');
  }

  // Validar formato de fecha YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(fechaConciliacion)) {
    throw new Error('La fecha debe estar en formato YYYY-MM-DD');
  }

  // Validar extensión del archivo
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (!ext || !['xls', 'xlsx'].includes(ext)) {
    throw new Error('Solo se permiten archivos .xls o .xlsx');
  }

  // Validar tamaño (20MB)
  const maxSize = 20 * 1024 * 1024;
  if (file.size > maxSize) {
    throw new Error('El archivo no puede superar 20MB');
  }

  const form = new FormData();
  form.append("file", file);
  form.append("fechaConciliacion", fechaConciliacion);

  try {
    const { data } = await api.post(`${BASE}/upload`, form, {
      headers: { 
        "Content-Type": "multipart/form-data" 
      },
      timeout: 60000, // 60 segundos para archivos grandes
    });
    return data;
  } catch (error: any) {
    console.error('Error uploading RedeBan file:', error);
    
    // Mejorar mensajes de error
    if (error?.response?.status === 413) {
      throw new Error('El archivo es demasiado grande');
    }
    
    if (error?.response?.status === 400) {
      const msg = error.response.data?.message || 'Datos inválidos';
      throw new Error(msg);
    }
    
    if (error?.response?.status === 401) {
      throw new Error('No estás autenticado. Por favor inicia sesión nuevamente.');
    }
    
    if (error?.response?.status === 403) {
      throw new Error('No tienes permisos para realizar esta acción');
    }
    
    throw error;
  }
}

export async function deleteRedeBanFile(id: number | string): Promise<{ ok: boolean; deletedId: string }> {
  try {
    const { data } = await api.delete(`${BASE}/${id}`);
    return data;
  } catch (error: any) {
    console.error(`Error deleting RedeBan file ${id}:`, error);
    throw error;
  }
}