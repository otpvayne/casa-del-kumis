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
    sucursal_nombre?: string;
    fecha_ventas: string;
    estado: EstadoConciliacion;
    causa_principal?: string | null;
    diferencia_calculada?: string | number | null;
    margen_permitido?: string | number | null;
    created_at?: string;
  };
  
  // Nuevas secciones mejoradas
  comparativa_totales: {
    total_voucher: number;
    total_banco_neto: number;
    base_liquidacion_redeban: number;
    neto_esperado_redeban: number;
    diff_voucher_vs_banco: number;
    diff_voucher_vs_redeban: number;
    diff_banco_vs_redeban: number;
    pct_diff_voucher_banco: number;
    pct_diff_voucher_redeban: number;
  };
  
  analisis_comisiones: {
    comision_esperada_total: number;
    comision_real_total: number;
    diferencia_comision: number;
    comision_promedio_por_tx: number;
    comision_esperada_promedio_por_tx: number;
    tasa_efectiva_real: number;
    tasa_efectiva_esperada: number;
    diferencia_tasa: number;
    pct_comision_real_sobre_banco: number; // ✅ NUEVO
    total_transacciones_con_comision: number;
  };
  
  metricas_calidad: {
    total_transacciones: number;
    transacciones_conciliadas: number;
    transacciones_con_problemas: number;
    tasa_conciliacion_exitosa: number;
    tasa_problemas: number;
    calidad_general: "EXCELENTE" | "BUENA" | "REGULAR" | "MALA";
  };
  
  desglose_por_franquicia: Record<string, {
    cantidad: number;
    monto_total_voucher: number;
    monto_total_banco: number;
    comision_total: number;
  }>;
  
  conteo_por_estado: Record<EstadoConciliacionTx, number>;
  
  sin_banco: Array<{
    id: string;
    voucher_tx_id: string | null;
    ultimos_digitos: string | null;
    numero_recibo?: string | null;
    monto_voucher?: number;
    franquicia?: string;
    observacion?: string | null;
  }>;
  
  sin_voucher: Array<{
    id: string;
    banco_detalle_id: string | null;
    ultimos_digitos: string | null;
    terminal?: string | null;
    numero_autoriza?: string | null;
    valor_consumo_banco?: number;
    valor_neto_banco?: number;
    franquicia?: string;
    observacion?: string | null;
  }>;
  
  top_diferencias_comision: Array<{
    id: string;
    estado?: EstadoConciliacionTx;
    ultimos_digitos: string | null;
    franquicia?: string;
    diferencia_comision: number;
    comision_esperada?: number;
    comision_banco?: number;
    valor_consumo?: number;
    banco_detalle_id?: string | null;
    voucher_tx_id?: string | null;
  }>;
  
  archivos_fuente: {
    voucher: {
      id: string;
      fecha_operacion: string;
      estado: string;
    } | null;
    archivo_banco: {
      id: string;
      nombre: string;
    } | null;
    archivo_redeban: {
      id: string;
      nombre: string;
    } | null;
  };
  
  parametros_aplicados: {
    tasa_comision: number;
    tasa_comision_pct: number;
    margen_error_permitido: number;
    dias_desfase_banco: number;
  };
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