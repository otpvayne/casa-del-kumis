function fmtMoney(n: any) {
  const num = typeof n === "string" ? Number(n) : Number(n ?? 0);
  return `$${num.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Card({ label, value, tone }: { label: string; value: string; tone?: "ok" | "warn" | "bad" | "info" }) {
  const toneCls =
    tone === "ok"
      ? "text-emerald-300"
      : tone === "warn"
      ? "text-amber-300"
      : tone === "bad"
      ? "text-red-300"
      : "text-sky-300";

  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-white/[0.02] p-4">
      <div className="text-xs text-white/60">{label}</div>
      <div className={`text-lg font-semibold mt-1 ${toneCls}`}>{value}</div>
    </div>
  );
}

export default function ConciliacionResumenCards({
  resumen,
  params,
}: {
  resumen: any;
  params: any;
}) {
  const stats = resumen?.matchStats ?? {};
  const diff = Number(resumen?.diferenciaCalculada ?? 0);
  const margen = Number(params?.margen_error_permitido ?? 0);

  const tone =
    Math.abs(diff) <= margen ? "ok" : Math.abs(diff) <= margen * 2 ? "warn" : "bad";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card label="Total Voucher (Global)" value={fmtMoney(resumen?.totalGlobalVoucher)} tone="info" />
        <Card label="Total Banco Ajustado" value={fmtMoney(resumen?.totalBancoAjustado)} tone="info" />
        <Card label="Base Liquidación RedeBan" value={fmtMoney(resumen?.baseLiquidacionRedeBan)} tone="info" />
        <Card label="Diferencia Calculada" value={fmtMoney(diff)} tone={tone as any} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="MATCH_OK" value={String(stats.matchOk ?? 0)} tone="ok" />
        <Card label="SIN_BANCO" value={String(stats.sinBanco ?? 0)} tone="bad" />
        <Card label="SIN_VOUCHER" value={String(stats.sinVoucher ?? 0)} tone="warn" />
        <Card label="COMISION_INCORRECTA" value={String(stats.comisionIncorrecta ?? 0)} tone="warn" />
      </div>

      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/70">
        <div className="flex flex-wrap gap-4">
          <span>
            <b>tasa_comision:</b> {params?.tasa_comision}
          </span>
          <span>
            <b>margen:</b> {params?.margen_error_permitido}
          </span>
          <span>
            <b>días desfase banco:</b> {params?.dias_desfase_banco}
          </span>
          <span>
            <b>causa principal:</b> {resumen?.causaPrincipal}
          </span>
        </div>
      </div>
    </div>
  );
}
