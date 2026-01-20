import { api } from "../../../lib/api";
import type { 
  ArchivoBanco, 
  RegistroBancoDetalle, 
  BancoUploadResponse 
} from "../types/banco.types";

// GET /banco - Listar archivos
export const getArchivosBanco = async (): Promise<ArchivoBanco[]> => {
  const { data } = await api.get("/banco");
  return data;
};

// GET /banco/:id - Obtener archivo con sus detalles
export const getArchivoBancoById = async (id: number): Promise<{
  archivo: ArchivoBanco;
  registros: RegistroBancoDetalle[];
}> => {
  const { data } = await api.get(`/banco/${id}`);
  return data;
};

// POST /banco/upload - Subir archivo Excel del banco
export const uploadBancoFile = async (
  file: File,
  fechaArchivo: string,
  sucursalId: number
): Promise<BancoUploadResponse> => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("fechaArchivo", fechaArchivo);
  formData.append("sucursalId", String(sucursalId));

  const { data } = await api.post("/banco/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return data;
};

// DELETE /banco/:id - Eliminar archivo (⚠️ verifica si existe en tu backend)
export const deleteArchivoBanco = async (id: number): Promise<void> => {
  await api.delete(`/banco/${id}`);
};