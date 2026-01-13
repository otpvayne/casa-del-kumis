import { useState } from "react";
import { uploadVoucherImage } from "../api/vouchers.api";

export default function UploadImagesModal({
  open,
  onClose,
  voucherId,
  onUploaded,
}: {
  open: boolean;
  onClose: () => void;
  voucherId: number;
  onUploaded: () => void;
}) {
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  if (!open) return null;

  async function handleUpload() {
    try {
      setErr("");
      setLoading(true);

      for (let i = 0; i < files.length; i++) {
        await uploadVoucherImage(voucherId, files[i], i + 1);
      }

      onUploaded();
      onClose();
      setFiles([]);
    } catch (e: any) {
      setErr(e?.message ?? "Error subiendo imágenes");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-lg rounded-2xl bg-neutral-950 border border-white/10 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Subir imágenes</h3>
          <button className="text-white/60 hover:text-white" onClick={onClose}>✕</button>
        </div>

        <p className="text-sm text-white/60 mt-2">
          Selecciona 1 o más fotos del voucher (parte 1, parte 2, etc.).
        </p>

        <input
          className="mt-4 block w-full text-sm"
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
        />

        {err && <div className="mt-3 text-sm text-red-300">{err}</div>}

        <div className="mt-6 flex gap-3 justify-end">
          <button
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="px-4 py-2 rounded-xl bg-white text-black font-semibold disabled:opacity-60"
            onClick={handleUpload}
            disabled={loading || files.length === 0}
          >
            {loading ? "Subiendo..." : "Subir"}
          </button>
        </div>
      </div>
    </div>
  );
}
