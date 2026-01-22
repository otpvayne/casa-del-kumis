import { useEffect, useState } from "react";
import { fetchRedeBanFiles } from "../api/redeban.api";
import type { RedeBanFile } from "../types";
import RedeBanUploadCard from "../components/RedeBanUploadCard";
import RedeBanTable from "../components/RedeBanTable";

export default function RedeBanListPage() {
  const [items, setItems] = useState<RedeBanFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    try {
      setErr("");
      setLoading(true);
      const data = await fetchRedeBanFiles();
      setItems(data);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? "Error cargando RedeBan");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">RedeBan</h1>
          <p className="text-sm text-white/60 mt-1">
            Gestiona archivos de liquidación RedeBan
          </p>
        </div>
        <button
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 transition font-medium text-sm"
          onClick={load}
          disabled={loading}
        >
          {loading ? 'Cargando...' : ' Refrescar'}
        </button>
      </div>

      <RedeBanUploadCard onUploaded={load} />

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-sky-500 mx-auto mb-3"></div>
            <p className="text-white/60 text-sm">Cargando archivos...</p>
          </div>
        </div>
      )}

      {err && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-red-300">⚠️ {err}</p>
        </div>
      )}

      {!loading && !err && (
        <RedeBanTable items={items} onDeleted={load} />
      )}
    </div>
  );
}