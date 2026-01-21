export type EstadoConciliacionTx =
  | "MATCH_OK"
  | "ABONO_DIA_SIGUIENTE"
  | "NO_ABONADO"
  | "VALOR_DIFERENTE"
  | "COMISION_INCORRECTA"
  | "PENDIENTE_REVISION"
  | "SIN_VOUCHER"
  | "SIN_BANCO";

export type GenerarConciliacionInput = {
  sucursalId: number;
  fechaVentas: string; // YYYY-MM-DD
  force?: boolean;
};

export type GenerarConciliacionResponse = {
  params: {
    tasa_comision: number;
    margen_error_permitido: number;
    dias_desfase_banco: number;
  };
  resumen: {
    sucursalId: number;
    fechaVentas: string;
    voucherId: string;
    totalVisaVoucher: number;
    totalMcVoucher: number;
    totalGlobalVoucher: number;
    baseLiquidacionRedeBan: number;
    totalBancoAjustado: number;
    comisionEsperadaTotal: number;
    diferenciaCalculada: number;
    matchStats: {
      totalVoucherTx: number;
      totalBancoTx: number;
      matchOk: number;
      abonoDiaSiguiente: number;
      comisionIncorrecta: number;
      valorDiferente: number;
      sinBanco: number;
      sinVoucher: number;
      totalGeneradas: number;
    };
    causaPrincipal: string;
  };
  conciliacion: {
    id: string;
    sucursal_id: string;
    fecha_ventas: string;
    voucher_id?: string | null;
    archivo_redeban_id?: string | null;
    archivo_banco_id?: string | null;
    estado: string;
    diferencia_calculada?: string | number | null;
    margen_permitido?: string | number | null;
    causa_principal?: string | null;
  };
};

export type ConciliacionResumenResponse = {
  conciliacion: {
    id: string;
    sucursal_id: string;
    fecha_ventas: string;
    estado: string;
    causa_principal?: string | null;
  };
  conteoPorEstado: Record<string, number>;
  sinBanco: Array<{
    id: string;
    voucher_tx_id: string | null;
    ultimos_digitos: string | null;
    numero_recibo?: string | null;
    monto_voucher?: string | number | null;
    observacion?: string | null;
  }>;
  sinVoucher: Array<{
    id: string;
    banco_detalle_id: string | null;
    ultimos_digitos: string | null;
    terminal?: string | null;
    numero_autoriza?: string | null;
    valor_consumo_banco?: string | number | null;
    valor_neto_banco?: string | number | null;
    observacion?: string | null;
  }>;
  topDiffComision: Array<{
    id: string;
    estado?: string;
    ultimos_digitos: string | null;
    diferencia_comision: number;
    comision_esperada?: string | number | null;
    comision_banco?: string | number | null;
    banco_detalle_id?: string | null;
    voucher_tx_id?: string | null;
  }>;
};
