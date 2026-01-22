import { uploadBancoFile } from "../api/banco.api";
import { useState, useEffect } from "react";
import { getSucursalesActivas } from "../../sucursales/api/sucursales.api";
import type { Sucursal } from "../../sucursales/types/sucursal.types";

type Props = {
  onUploadSuccess?: () => void;
};

export default function BancoUpload({ onUploadSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [fechaArchivo, setFechaArchivo] = useState<string>("");
  const [sucursalId, setSucursalId] = useState<number | null>(null);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loadingSucursales, setLoadingSucursales] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadSucursales() {
      try {
        const data = await getSucursalesActivas();
        setSucursales(data);
        if (data.length > 0) {
          setSucursalId(Number(data[0].id));
        }
      } catch (err) {
        console.error("Error cargando sucursales:", err);
        setError("Error al cargar sucursales");
      } finally {
        setLoadingSucursales(false);
      }
    }
    loadSucursales();
  }, []);

  const handleUpload = async () => {
    if (!file) {
      setError("Debes seleccionar un archivo");
      return;
    }

    if (!fechaArchivo) {
      setError("Debes seleccionar la fecha del archivo");
      return;
    }

    if (!sucursalId) {
      setError("Debes seleccionar una sucursal");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await uploadBancoFile(file, fechaArchivo, sucursalId);
      setSuccess(`✓ Archivo procesado: ${result.totalFilas} registros creados en ${result.sucursal.nombre}`);
      setFile(null);
      setFechaArchivo("");
      
      // Limpiar input file
      const fileInput = document.getElementById("banco-file-input") as HTMLInputElement;
      if (fileInput) fileInput.value = "";

      // Callback opcional
      if (onUploadSuccess) {
        setTimeout(onUploadSuccess, 1500);
      }
    } catch (err: any) {
      console.error("Error subiendo archivo:", err);
      setError(err.response?.data?.message || "Error al procesar el archivo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-6">
      <h2 className="text-lg font-semibold mb-4"> Cargar Archivo del Banco</h2>
      
      <p className="text-sm text-white/60 mb-4">
        Sube el archivo Excel (.xlsx/.xls) que contiene los registros bancarios detallados
      </p>

      <div className="space-y-4">
        {/* Sucursal */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Sucursal <span className="text-red-400">*</span>
          </label>
          {loadingSucursales ? (
            <div className="text-sm text-white/60">Cargando sucursales...</div>
          ) : sucursales.length === 0 ? (
            <div className="text-sm text-red-300">No hay sucursales activas disponibles</div>
          ) : (
            <select
              value={sucursalId ?? ""}
              onChange={(e) => setSucursalId(Number(e.target.value))}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id} className="bg-gray-900">
                  {s.nombre}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Fecha del archivo */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Fecha del Archivo <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={fechaArchivo}
            onChange={(e) => setFechaArchivo(e.target.value)}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Selector de archivo */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Archivo Excel <span className="text-red-400">*</span>
          </label>
          <input
            id="banco-file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setError(null);
              setSuccess(null);
            }}
            className="block w-full text-sm text-white/70
              file:mr-4 file:py-2 file:px-4
              file:rounded-lg file:border-0
              file:text-sm file:font-semibold
              file:bg-sky-500 file:text-black
              hover:file:bg-sky-400
              file:cursor-pointer cursor-pointer
              border border-white/10 rounded-lg
              bg-white/5 p-2"
          />
          {file && (
            <p className="text-xs text-white/60 mt-2">
              📄 {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </p>
          )}
        </div>

        {/* Mensajes */}
        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {/* Botón */}
        <button
          onClick={handleUpload}
          disabled={!file || !fechaArchivo || !sucursalId || loading || loadingSucursales}
          className="w-full px-6 py-3 rounded-lg bg-sky-500 text-black font-semibold hover:bg-sky-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="animate-spin">⏳</span>
              Procesando archivo...
            </span>
          ) : (
            "Subir y Procesar"
          )}
        </button>
      </div>
    </div>
  );
}