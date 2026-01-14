import { useState } from "react";

type Props = {
  images: {
    id: string;
    ruta_imagen: string;
    orden: number;
  }[];
};

function toPublicUploadUrl(ruta: string) {
  const normalized = ruta.replaceAll("\\", "/");
  const idx = normalized.indexOf("/uploads/");
  if (idx === -1) return "";
  return `http://localhost:3000${normalized.slice(idx)}`;
}

export default function VoucherImageViewer({ images }: Props) {
  const ordered = [...images].sort((a, b) => a.orden - b.orden);
  const [zoomed, setZoomed] = useState<string | null>(null);

  if (ordered.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-white/40 text-sm">
        No hay imágenes
      </div>
    );
  }

  return (
    <>
      {/* CONTENEDOR */}
      <div className="h-full overflow-y-auto space-y-4 pr-2">
        {ordered.map((img) => (
          <img
            key={img.id}
            src={toPublicUploadUrl(img.ruta_imagen)}
            onClick={() => setZoomed(toPublicUploadUrl(img.ruta_imagen))}
            className="
              w-full 
              object-contain 
              rounded-lg 
              border border-white/10 
              cursor-zoom-in
              hover:opacity-90
            "
          />
        ))}
      </div>

      {/* ZOOM MODAL */}
      {zoomed && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-6"
          onClick={() => setZoomed(null)}
        >
          <img
            src={zoomed}
            className="max-h-full max-w-full object-contain cursor-zoom-out"
          />
        </div>
      )}
    </>
  );
}
