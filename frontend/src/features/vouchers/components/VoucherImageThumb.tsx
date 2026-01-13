import { useEffect, useState } from "react";
import { api } from "../../../lib/api";

export default function VoucherImageThumb({ imageId, orden }: { imageId: string; orden: number }) {
  const [src, setSrc] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let url = "";

    async function load() {
      try {
        setLoading(true);
        const res = await api.get(`/vouchers/imagenes/${imageId}/file`, {
          responseType: "blob",
        });
        url = URL.createObjectURL(res.data);
        setSrc(url);
      } finally {
        setLoading(false);
      }
    }

    load();

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [imageId]);

  if (loading) {
    return (
      <div className="w-40 h-52 rounded-xl border border-white/10 bg-white/5 flex items-center justify-center text-white/60 text-xs">
        Cargando...
      </div>
    );
  }

  return (
    <div className="w-40">
      <div className="text-xs text-white/60 mb-2">Orden #{orden}</div>
      <img
        src={src}
        alt={`voucher-${imageId}`}
        className="w-40 h-52 object-cover rounded-xl border border-white/10"
      />
    </div>
  );
}
