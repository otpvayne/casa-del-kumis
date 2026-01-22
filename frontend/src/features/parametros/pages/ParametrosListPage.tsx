import { useEffect, useState } from "react";
import { fetchParametrosActive, fetchParametrosAll } from "../api/parametros.api";
import type { ParametrosSistema } from "../types";
import ParametrosActiveCard from "../components/ParametrosActiveCard";
import ParametrosCreateCard from "../components/ParametrosCreateCard";
import ParametrosTable from "../components/ParametrosTable";

export default function ParametrosListPage() {
  const [active, setActive] = useState<ParametrosSistema | null>(null);
  const [items, setItems] = useState<ParametrosSistema[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    try {
      setErr("");
      setLoading(true);

      // Active puede fallar si aún no hay ninguno
      try {
        const a = await fetchParametrosActive();
        setActive(a);
      } catch {
        setActive(null);
      }

      const all = await fetchParametrosAll();
      // Ordenar: activo primero + más reciente arriba
      all.sort((a, b) => {
        if (a.activo && !b.activo) return -1;
        if (!a.activo && b.activo) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      setItems(all);
    } catch (e: any) {
      setErr(e?.response?.data?.message ?? e?.message ?? "Error cargando parámetros");
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
        <h1 className="text-2xl font-semibold">Parámetros del sistema</h1>
        <button className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15" onClick={load}>
          Refrescar
        </button>
      </div>

      <ParametrosActiveCard active={active} />
        <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm text-yellow-300">
        ⚠️ <strong>Nota:</strong> Si realizas cambios y no los ves reflejados de inmediato,
        presiona <strong>F5</strong> en tu teclado para actualizar la información.
      </div>
      <ParametrosCreateCard onCreated={load} />

      {loading && <p className="text-white/60">Cargando...</p>}
      {err && <p className="text-red-300">{err}</p>}

      {!loading && !err && (
        <ParametrosTable items={items} onChange={load} />
      )}
    </div>
  );
}
