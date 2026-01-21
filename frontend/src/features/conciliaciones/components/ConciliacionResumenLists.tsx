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
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold">🚫 SIN_BANCO</h3>
          <p className="text-xs text-white/60 mt-1">Transacciones del voucher sin match en banco.</p>
        </div>

        <div className="p-4 space-y-3 max-h-[420px] overflow-auto">
          {sinBanco?.length ? (
            sinBanco.map((r) => (
              <div key={r.id} className="rounded-lg border border-white/10 p-3 bg-black/10">
                <div className="flex items-center justify-between">
                  <Badge text={`last4: ${r.ultimos_digitos ?? "—"}`} />
                  <span className="text-xs text-white/50">id {r.id}</span>
                </div>
                <div className="mt-2 text-sm">
                  <div className="text-white/80">monto: {fmtMoney(r.monto_voucher)}</div>
                  {r.numero_recibo && <div className="text-white/50 text-xs">recibo: {r.numero_recibo}</div>}
                  {r.observacion && <div className="text-white/50 text-xs mt-1">{r.observacion}</div>}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-white/50">No hay casos.</div>
          )}
        </div>
      </div>

      {/* SIN_VOUCHER */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold">🧾 SIN_VOUCHER</h3>
          <p className="text-xs text-white/60 mt-1">Transacciones en banco sin match en voucher.</p>
        </div>

        <div className="p-4 space-y-3 max-h-[420px] overflow-auto">
          {sinVoucher?.length ? (
            sinVoucher.map((r) => (
              <div key={r.id} className="rounded-lg border border-white/10 p-3 bg-black/10">
                <div className="flex items-center justify-between">
                  <Badge text={`last4: ${r.ultimos_digitos ?? "—"}`} />
                  <span className="text-xs text-white/50">id {r.id}</span>
                </div>
                <div className="mt-2 text-sm">
                  <div className="text-white/80">neto: {fmtMoney(r.valor_neto_banco)}</div>
                  <div className="text-white/50 text-xs">
                    terminal: {r.terminal ?? "—"} · auth: {r.numero_autoriza ?? "—"}
                  </div>
                  {r.observacion && <div className="text-white/50 text-xs mt-1">{r.observacion}</div>}
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-white/50">No hay casos.</div>
          )}
        </div>
      </div>

      {/* TOP DIF COMISIÓN */}
      <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold">📉 Top Diferencias Comisión</h3>
          <p className="text-xs text-white/60 mt-1">Top 10 por diferencia_comision.</p>
        </div>

        <div className="p-4 space-y-3 max-h-[420px] overflow-auto">
          {topDiffComision?.length ? (
            topDiffComision.map((r) => (
              <div key={r.id} className="rounded-lg border border-white/10 p-3 bg-black/10">
                <div className="flex items-center justify-between">
                  <Badge text={`last4: ${r.ultimos_digitos ?? "—"}`} />
                  <Badge text={String(r.estado ?? "—")} />
                </div>

                <div className="mt-2 text-sm">
                  <div className="text-amber-300 font-semibold">
                    diff: {fmtMoney(r.diferencia_comision)}
                  </div>
                  <div className="text-white/50 text-xs mt-1">
                    esperada: {fmtMoney(r.comision_esperada)} · banco: {fmtMoney(r.comision_banco)}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-sm text-white/50">No hay casos.</div>
          )}
        </div>
      </div>
    </div>
  );
}
