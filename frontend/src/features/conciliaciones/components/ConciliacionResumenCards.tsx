function fmtMoney(n: any) {
  const num = typeof n === "string" ? Number(n) : Number(n ?? 0);
  return `$${num.toLocaleString("es-CO", { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

function fmtPercent(n: any) {
  const num = typeof n === "string" ? Number(n) : Number(n ?? 0);
  return `${num.toFixed(2)}%`;
}

function Card({ 
  label, 
  value, 
  tone,
  subtitle 
}: { 
  label: string; 
  value: string; 
  tone?: "ok" | "warn" | "bad" | "info" | "neutral";
  subtitle?: string;
}) {
  const toneCls =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
      ? "text-amber-300"
      : tone === "bad"
      ? "text-red-300"
      : tone === "info"
      ? "text-sky-300"
      : "text-white/80";

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4">
      <div className="text-xs text-white/60">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${toneCls}`}>{value}</div>
      {subtitle && (
        <div className="text-xs text-white/50 mt-1">{subtitle}</div>
      )}
    </div>
  );
}

export default function ConciliacionResumenCards({
  resumen,
}: {
  resumen: any;
}) {
  const comparativa = resumen?.comparativa_totales ?? {};
  const comisiones = resumen?.analisis_comisiones ?? {};
  const calidad = resumen?.metricas_calidad ?? {};
  const params = resumen?.parametros_aplicados ?? {};
  const franquicias = resumen?.desglose_por_franquicia ?? {};

  // Determinar tono para diferencias
  const diffTone = (diff: number, margen: number) => {
    const abs = Math.abs(diff);
    if (abs <= margen) return "ok";
    if (abs <= margen * 2) return "warn";
    return "bad";
  };

  const calidadTone = 
    calidad.calidad_general === "EXCELENTE" ? "ok" :
    calidad.calidad_general === "BUENA" ? "info" :
    calidad.calidad_general === "REGULAR" ? "warn" : "bad";

  return (
    <div className="space-y-6">
      {/* Sección 1: Comparativa de Totales */}
      <div>
        <h3 className="text-sm font-semibold text-white/80 mb-3">
          📊 Comparativa de Totales
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            label="Total Voucher (Global)" 
            value={fmtMoney(comparativa.total_voucher)} 
            tone="info" 
          />
          <Card 
            label="Total Banco (Neto)" 
            value={fmtMoney(comparativa.total_banco_neto)} 
            tone="info"
          />
          <Card 
            label="Neto Esperado RedeBan" 
            value={fmtMoney(comparativa.neto_esperado_redeban)} 
            tone="info"
            subtitle={`Base: ${fmtMoney(comparativa.base_liquidacion_redeban)}`}
          />
        </div>

        {/* Diferencias */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Card 
            label="Diff: Voucher vs Banco" 
            value={fmtMoney(comparativa.diff_voucher_vs_banco)} 
            tone={diffTone(comparativa.diff_voucher_vs_banco, params.margen_error_permitido)}
            subtitle={fmtPercent(comparativa.pct_diff_voucher_banco)}
          />
          
        </div>
      </div>

      {/* Sección 2: Análisis de Comisiones */}
      <div>
        <h3 className="text-sm font-semibold text-white/80 mb-3">
          💰 Análisis de Comisiones
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card 
            label="Comisión Esperada Total" 
            value={fmtMoney(comisiones.comision_esperada_total)} 
            tone="info"
          />
          <Card 
            label="Comisión Real Total" 
            value={fmtMoney(comisiones.comision_real_total)} 
            tone={comisiones.diferencia_comision > params.margen_error_permitido ? "warn" : "ok"}
            subtitle={`${fmtPercent(comisiones.pct_comision_real_sobre_banco)} del total banco`} 
          />
          <Card 
            label="Diferencia en Comisión" 
            value={fmtMoney(comisiones.diferencia_comision)} 
            tone={comisiones.diferencia_comision > params.margen_error_permitido ? "bad" : "ok"}
          />
          <Card 
            label="Tasa Efectiva Real" 
            value={fmtPercent(comisiones.tasa_efectiva_real)} 
            tone={Math.abs(comisiones.tasa_efectiva_real - comisiones.tasa_efectiva_esperada) > 0.1 ? "warn" : "ok"}
            subtitle={`Esperada: ${fmtPercent(comisiones.tasa_efectiva_esperada)}`}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Card 
            label="Comisión Promedio por Transacción" 
            value={fmtMoney(comisiones.comision_promedio_por_tx)} 
            tone="neutral"
            subtitle={`Esperada: ${fmtMoney(comisiones.comision_esperada_promedio_por_tx)}`}
          />
          <Card 
            label="Total Transacciones con Comisión" 
            value={String(comisiones.total_transacciones_con_comision)} 
            tone="info"
          />
        </div>
      </div>

      {/* Sección 3: Métricas de Calidad */}
      <div>
        <h3 className="text-sm font-semibold text-white/80 mb-3">
          ✅ Métricas de Calidad de Conciliación
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card 
            label="Calidad General" 
            value={calidad.calidad_general} 
            tone={calidadTone}
          />
          <Card 
            label="Tasa de Conciliación Exitosa" 
            value={fmtPercent(calidad.tasa_conciliacion_exitosa)} 
            tone={calidad.tasa_conciliacion_exitosa >= 95 ? "ok" : "warn"}
          />
          <Card 
            label="Transacciones Conciliadas" 
            value={`${calidad.transacciones_conciliadas} / ${calidad.total_transacciones}`}
            tone="info"
          />
          <Card 
            label="Transacciones con Problemas" 
            value={String(calidad.transacciones_con_problemas)} 
            tone={calidad.transacciones_con_problemas === 0 ? "ok" : "warn"}
            subtitle={`${fmtPercent(calidad.tasa_problemas)} del total`}
          />
        </div>
      </div>

      {/* Sección 4: Desglose por Franquicia */}
      {Object.keys(franquicias).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-white/80 mb-3">
            💳 Desglose por Franquicia
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(franquicias).map(([franq, data]: [string, any]) => (
              <div 
                key={franq}
                className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">{franq}</span>
                  <span className="text-xs text-white/60">{data.cantidad} tx</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-white/60">Voucher:</span>
                    <span className="text-white/90">{fmtMoney(data.monto_total_voucher)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Banco:</span>
                    <span className="text-white/90">{fmtMoney(data.monto_total_banco)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-white/60">Comisión:</span>
                    <span className="text-amber-300">{fmtMoney(data.comision_total)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sección 5: Parámetros Aplicados */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm font-semibold text-white/80 mb-3">
          ⚙️ Parámetros Aplicados
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-white/70">
          <span>
            <b>Tasa comisión:</b> {fmtPercent(params.tasa_comision_pct)}
          </span>
          <span>
            <b>Margen error:</b> {fmtMoney(params.margen_error_permitido)}
          </span>
          <span>
            <b>Días desfase banco:</b> {params.dias_desfase_banco}
          </span>
        </div>
      </div>
    </div>
  );
}