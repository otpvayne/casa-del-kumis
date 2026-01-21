import { useState } from "react";
import ConciliacionHeader from "../components/ConciliacionHeader";
import ConciliacionGenerateCard from "../components/ConciliacionGenerateCard";
import type { GenerarConciliacionResponse } from "../types";
import ConciliacionResumenCards from "../components/ConciliacionResumenCards";

export default function ConciliacionesPage() {
  const [last, setLast] = useState<GenerarConciliacionResponse | null>(null);

  return (
    <div className="space-y-6">
      <ConciliacionHeader />

      <ConciliacionGenerateCard onGenerated={setLast} />

      {last && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-sm text-white/70">
              Última conciliación generada: <b>#{last.conciliacion.id}</b>
            </div>
            <div className="text-xs text-white/50 mt-1">
              Puedes abrir el resumen en: <b>/conciliaciones/{last.conciliacion.id}/resumen</b>
            </div>
          </div>

          <ConciliacionResumenCards resumen={last.resumen} params={last.params} />
        </div>
      )}
    </div>
  );
}
