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
        <h1 className="text-2xl font-semibold">RedeBan</h1>
        <button
          className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15"
          onClick={load}
        >
          Refrescar
        </button>
      </div>

      <RedeBanUploadCard onUploaded={load} />

      {loading && <p className="text-white/60">Cargando...</p>}
      {err && <p className="text-red-300">{err}</p>}

      {!loading && !err && <RedeBanTable items={items} />}
    </div>
  );
}
