import { useRef, useState } from "react";
import { uploadRedeBanFile } from "../api/redeban.api";

export default function RedeBanUploadCard({ onUploaded }: { onUploaded: () => void }) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [fechaConciliacion, setFechaConciliacion] = useState("");

  async function handlePick() {
    if (!fechaConciliacion) {
      alert("⚠️ Debes seleccionar la fecha de conciliación primero");
      return;
    }
    inputRef.current?.click();
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!fechaConciliacion) {
      alert("⚠️ Debes seleccionar la fecha de conciliación");
      return;
    }

    try {
      setUploading(true);
      await uploadRedeBanFile(file, fechaConciliacion);
      alert("✅ Archivo RedeBan cargado correctamente");
      setFechaConciliacion(""); // Limpiar fecha
      onUploaded();
    } catch (err: any) {
      console.error(err);
      alert(`❌ Error subiendo archivo: ${err?.response?.data?.message ?? err?.message ?? "Error"}`);
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
          Sube el archivo de liquidación RedeBan para procesar registros y usarlos en conciliación.
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
            onChange={(e) => setFechaConciliacion(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
          />
        </div>

        {/* Input oculto + botón */}
        <div className="flex items-center gap-3">
          <input 
            ref={inputRef} 
            type="file" 
            accept=".xls,.xlsx"
            className="hidden" 
            onChange={handleChange} 
          />
          <button
            onClick={handlePick}
            disabled={uploading || !fechaConciliacion}
            className="px-6 py-3 rounded-lg bg-sky-500 text-black font-semibold hover:bg-sky-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Subiendo..." : "Seleccionar y Subir Archivo"}
          </button>
          
          {!fechaConciliacion && (
            <p className="text-sm text-amber-400">
              ⚠️ Selecciona la fecha primero
            </p>
          )}
        </div>
      </div>
    </div>
  );
}