function fmtMoney(n: any) {
  const num = typeof n === "string" ? Number(n) : Number(n ?? 0);
  return `$${num.toLocaleString("es-CO", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Badge({ text }: { text: string }) {
  return (
    <span className="px-2 py-1 rounded-lg text-xs bg-white/10 text-white/80">
      {text}
    </span>
  );
}

export default function ConciliacionResumenLists({
  sinBanco,
  sinVoucher,
  topDiffComision,
}: {
  sinBanco: any[];
  sinVoucher: any[];
  topDiffComision: any[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* SIN_BANCO */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-red-500/5">
          <h3 className="font-semibold text-red-300">🚫 SIN_BANCO</h3>
          <p className="text-xs text-white/60 mt-1">
            Transacciones del voucher sin match en banco ({sinBanco?.length || 0})
          </p>
        </div>

        <div className="p-4 space-y-3 max-h-[420px] overflow-auto">
          {sinBanco?.length ? (
            sinBanco.map((r) => (
              <div key={r.id} className="rounded-lg border border-white/10 p-3 bg-black/10">
                <div className="flex items-center justify-between mb-2">
                  <Badge text={`last4: ${r.ultimos_digitos ?? "—"}`} />
                  <span className="text-xs text-white/50">
                    {r.franquicia || "—"}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="text-white/80">
                    Monto: <b>{fmtMoney(r.monto_voucher)}</b>
                  </div>
                  {r.numero_recibo && (
                    <div className="text-white/50 text-xs">
                      Recibo: {r.numero_recibo}
                    </div>
                  )}
                  {r.observacion && (
                    <div className="text-white/50 text-xs mt-1 italic">
                      {r.observacion}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-white/50 text-center py-8">
              ✅ No hay casos
            </div>
          )}
        </div>
      </div>

      {/* SIN_VOUCHER */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-amber-500/5">
          <h3 className="font-semibold text-amber-300">🧾 SIN_VOUCHER</h3>
          <p className="text-xs text-white/60 mt-1">
            Transacciones en banco sin match en voucher ({sinVoucher?.length || 0})
          </p>
        </div>

        <div className="p-4 space-y-3 max-h-[420px] overflow-auto">
          {sinVoucher?.length ? (
            sinVoucher.map((r) => (
              <div key={r.id} className="rounded-lg border border-white/10 p-3 bg-black/10">
                <div className="flex items-center justify-between mb-2">
                  <Badge text={`last4: ${r.ultimos_digitos ?? "—"}`} />
                  <span className="text-xs text-white/50">
                    {r.franquicia || "—"}
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="text-white/80">
                    Neto: <b>{fmtMoney(r.valor_neto_banco)}</b>
                  </div>
                  <div className="text-white/50 text-xs">
                    Terminal: {r.terminal ?? "—"} • Auth: {r.numero_autoriza ?? "—"}
                  </div>
                  {r.observacion && (
                    <div className="text-white/50 text-xs mt-1 italic">
                      {r.observacion}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-white/50 text-center py-8">
              ✅ No hay casos
            </div>
          )}
        </div>
      </div>

      {/* TOP DIF COMISIÓN */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10 bg-sky-500/5">
          <h3 className="font-semibold text-sky-300">📉 Top Diferencias Comisión</h3>
          <p className="text-xs text-white/60 mt-1">
            Top 10 por diferencia de comisión ({topDiffComision?.length || 0})
          </p>
        </div>

        <div className="p-4 space-y-3 max-h-[420px] overflow-auto">
          {topDiffComision?.length ? (
            topDiffComision.map((r) => (
              <div key={r.id} className="rounded-lg border border-white/10 p-3 bg-black/10">
                <div className="flex items-center justify-between mb-2">
                  <Badge text={`last4: ${r.ultimos_digitos ?? "—"}`} />
                  <span className="text-xs text-white/50">
                    {r.franquicia || r.estado || "—"}
                  </span>
                </div>

                <div className="text-sm space-y-1">
                  <div className="text-amber-300 font-semibold">
                    Diferencia: {fmtMoney(r.diferencia_comision)}
                  </div>
                  <div className="text-white/50 text-xs">
                    Esperada: {fmtMoney(r.comision_esperada)} • Real: {fmtMoney(r.comision_banco)}
                  </div>
                  {r.valor_consumo && (
                    <div className="text-white/50 text-xs">
                      Consumo: {fmtMoney(r.valor_consumo)}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-white/50 text-center py-8">
              ✅ No hay diferencias significativas
            </div>
          )}
        </div>
      </div>
    </div>
  );
}