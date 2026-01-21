export type EstadoConciliacionTx =
  | "MATCH_OK"
  | "ABONO_DIA_SIGUIENTE"
  | "NO_ABONADO"
  | "VALOR_DIFERENTE"
  | "COMISION_INCORRECTA"
  | "PENDIENTE_REVISION"
  | "SIN_VOUCHER"
  | "SIN_BANCO";

export type EstadoConciliacion =
  | "PROCESANDO"
  | "FINALIZADO"
  | "ERROR"
  | "PENDIENTE";

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
    estado: EstadoConciliacion;
    diferencia_calculada?: string | number | null;
    margen_permitido?: string | number | null;
    causa_principal?: string | null;
    created_at?: string;
    updated_at?: string;
  };
};

export type ConciliacionResumenResponse = {
  conciliacion: {
    id: string;
    sucursal_id: string;
    fecha_ventas: string;
    estado: EstadoConciliacion;
    causa_principal?: string | null;
    diferencia_calculada?: string | number | null;
    created_at?: string;
  };
  conteoPorEstado: Record<EstadoConciliacionTx, number>;
  sinBanco: Array<{
    id: string;
    voucher_tx_id: string | null;
    ultimos_digitos: string | null;
    numero_recibo?: string | null;
    monto_voucher?: string | number | null;
    observacion?: string | null;
    estado: EstadoConciliacionTx;
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
    estado: EstadoConciliacionTx;
  }>;
  topDiffComision: Array<{
    id: string;
    estado?: EstadoConciliacionTx;
    ultimos_digitos: string | null;
    diferencia_comision: number;
    comision_esperada?: string | number | null;
    comision_banco?: string | number | null;
    banco_detalle_id?: string | null;
    voucher_tx_id?: string | null;
  }>;
};

export type Conciliacion = {
  id: string;
  sucursal_id: string;
  fecha_ventas: string;
  voucher_id?: string | null;
  archivo_redeban_id?: string | null;
  archivo_banco_id?: string | null;
  estado: EstadoConciliacion;
  diferencia_calculada?: string | number | null;
  margen_permitido?: string | number | null;
  causa_principal?: string | null;
  observaciones?: string | null;
  created_at: string;
  updated_at?: string;
  sucursal?: {
    id: string;
    nombre: string;
    codigo_comercio_redeban?: string;
  };
  _count?: {
    conciliaciones_transacciones: number;
  };
};

export type ConciliacionTransaccion = {
  id: string;
  conciliacion_id: string;
  voucher_tx_id?: string | null;
  banco_detalle_id?: string | null;
  estado: EstadoConciliacionTx;
  ultimos_digitos?: string | null;
  monto_voucher?: string | number | null;
  valor_consumo_banco?: string | number | null;
  valor_neto_banco?: string | number | null;
  comision_esperada?: string | number | null;
  comision_banco?: string | number | null;
  diferencia_comision?: string | number | null;
  fecha_venta_voucher?: string | null;
  fecha_vale_banco?: string | null;
  dias_diferencia?: number | null;
  observacion?: string | null;
  created_at: string;
};