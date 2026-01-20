import { useEffect, useState } from "react";
import { getArchivosBanco } from "../api/banco.api";
import type { ArchivoBanco } from "../types/banco.types";

export function useBanco() {
  const [data, setData] = useState<ArchivoBanco[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadArchivos() {
    try {
      setLoading(true);
      const archivos = await getArchivosBanco();
      setData(archivos);
      setError(null);
    } catch (err: any) {
      console.error("Error cargando archivos banco:", err);
      setError(err.response?.data?.message || "Error al cargar archivos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadArchivos();
  }, []);

  return { data, loading, error, reload: loadArchivos };
}