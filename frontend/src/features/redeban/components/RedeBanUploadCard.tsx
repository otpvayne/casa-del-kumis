import { useRef, useState } from "react";
import { uploadRedeBanFile } from "../api/redeban.api";

export default function RedeBanUploadCard({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fechaConciliacion, setFechaConciliacion] = useState("");
  const [error, setError] = useState("");

  async function handlePick() {
    setError("");
    
    if (!fechaConciliacion) {
      setError("⚠️ Debes seleccionar la fecha de conciliación primero");
      return;
    }

    // Validar que la fecha no sea futura
    const selected = new Date(fechaConciliacion);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selected > today) {
      setError("⚠️ La fecha de conciliación no puede ser futura");
      return;
    }

    inputRef.current?.click();
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    // Validar extensión
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['xls', 'xlsx'].includes(ext)) {
      setError("⚠️ Solo se permiten archivos .xls o .xlsx");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    // Validar tamaño (20MB)
    if (file.size > 20 * 1024 * 1024) {
      setError("⚠️ El archivo no puede superar 20MB");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    if (!fechaConciliacion) {
      setError("⚠️ Debes seleccionar la fecha de conciliación");
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    try {
      setUploading(true);
      const result = await uploadRedeBanFile(file, fechaConciliacion);
      
      // Mostrar mensaje de éxito con detalles
      const msg = `✅ Archivo procesado correctamente
📄 ${result.nombre_original}
📊 ${result._count?.registros_redeban ?? 0} registros cargados
📅 Fecha: ${new Date(result.fecha_conciliacion).toLocaleDateString('es-CO')}`;
      
      alert(msg);
      
      setFechaConciliacion("");
      onUploaded();
    } catch (err: any) {
      console.error('Error uploading RedeBan:', err);
      
      let errorMsg = "Error desconocido al subir el archivo";
      
      if (err?.response?.data?.message) {
        errorMsg = err.response.data.message;
      } else if (err?.message) {
        errorMsg = err.message;
      }
      
      setError(`❌ ${errorMsg}`);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6">
      <div className="mb-4">
        <h2 className="font-semibold text-lg">📤 Subir Archivo RedeBan</h2>
        <p className="text-sm text-white/60 mt-1">
          Sube el archivo de liquidación RedeBan (.xls o .xlsx) para procesar registros y usarlos en conciliación.
        </p>
      </div>

      <div className="space-y-4">
        {/* Fecha de conciliación */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-2">
            Fecha de Conciliación <span className="text-red-400">*</span>
          </label>
          <input
            type="date"
            value={fechaConciliacion}
            onChange={(e) => {
              setFechaConciliacion(e.target.value);
              setError(""); // Limpiar error al cambiar
            }}
            max={new Date().toISOString().split('T')[0]}
            disabled={uploading}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <p className="text-xs text-white/40 mt-1">
            Selecciona la fecha que aparece en el archivo RedeBan
          </p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {/* Input oculto + botón */}
        <div className="flex items-center gap-3">
          <input 
            ref={inputRef} 
            type="file" 
            accept=".xls,.xlsx"
            className="hidden" 
            onChange={handleChange}
            disabled={uploading}
          />
          <button
            onClick={handlePick}
            disabled={uploading || !fechaConciliacion}
            className="px-6 py-3 rounded-lg bg-sky-500 text-black font-semibold hover:bg-sky-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                </svg>
                Procesando...
              </span>
            ) : (
              "Seleccionar y Subir Archivo"
            )}
          </button>
          
          {!fechaConciliacion && !error && (
            <p className="text-sm text-amber-400">
              ⚠️ Selecciona la fecha primero
            </p>
          )}
        </div>

        {/* Información adicional */}
        <div className="px-4 py-3 rounded-lg bg-sky-500/10 border border-sky-500/20">
          <p className="text-xs text-sky-300">
            ℹ️ El sistema validará que los códigos de comercio existan en el sistema antes de procesar el archivo.
          </p>
        </div>
      </div>
    </div>
  );
}