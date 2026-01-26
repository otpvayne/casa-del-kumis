import { useEffect, useMemo, useState } from "react";
import { api } from "../../../lib/api";

type VoucherImagen = {
  id: string;
  orden: number;
};

export default function VoucherImageViewer({ images }: { images: VoucherImagen[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const ordered = useMemo(() => {
    return [...(images || [])].sort((a, b) => a.orden - b.orden);
  }, [images]);

  // auto seleccionar la primera
  useEffect(() => {
    if (!ordered.length) {
      setSelectedId(null);
      setImgUrl(null);
      return;
    }
    setSelectedId((prev) => prev ?? ordered[0].id);
  }, [ordered]);

  // cargar blob cuando cambie selectedId
  useEffect(() => {
    let objectUrl: string | null = null;

    async function load() {
      if (!selectedId) return;
      try {
        setLoading(true);
        setImgUrl(null);

        const res = await api.get(`/vouchers/imagenes/${selectedId}/file`, {
          responseType: "blob",
        });

        objectUrl = URL.createObjectURL(res.data);
        setImgUrl(objectUrl);
      } catch (e) {
        console.error("Error cargando imagen voucher:", e);
        setImgUrl(null);
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedId]);

  if (!ordered.length) {
    return (
      <div className="text-white/50 text-sm">
        No hay imágenes
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* VISOR */}
      <div className="bg-black/20 border border-white/10 rounded-xl p-2 h-[520px] flex items-center justify-center overflow-hidden">
        {loading && <p className="text-white/50 text-sm">Cargando imagen...</p>}

        {!loading && imgUrl && (
          <img
            src={imgUrl}
            alt="Voucher"
            className="max-h-[500px] w-full object-contain rounded-lg"
          />
        )}

        {!loading && !imgUrl && (
          <p className="text-red-300/80 text-sm">No se pudo cargar la imagen</p>
        )}
      </div>

      {/* THUMBNAILS */}
      {ordered.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {ordered.map((img) => (
            <button
              key={img.id}
              onClick={() => setSelectedId(img.id)}
              className={`px-3 py-1 rounded-lg border text-xs whitespace-nowrap
                ${selectedId === img.id
                  ? "border-sky-400/60 bg-sky-400/10 text-sky-200"
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
                }`}
            >
              Parte {img.orden}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
