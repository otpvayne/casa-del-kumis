export type RedeBanFile = {
  id: string; // BigInt serializado
  nombre_original: string;
  fecha_conciliacion: string; // ISO
  estado: string; // CARGADO, PROCESADO, ERROR
  hash_contenido?: string;
  ruta_archivo?: string;
  usuario_id?: string;
  created_at: string;
  _count?: {
    registros_redeban: number;
  };
};

export type RedeBanRow = {
  id: string; // BigInt serializado
  archivo_redeban_id: string;
  sucursal_id: string;
  codigo_comercio: string;
  direccion: string;
  cantidad_transacciones: number;
  
  // Valores monetarios (vienen como string de Prisma Decimal)
  valor_bruto: string;
  iva: string;
  consumo: string;
  tasa_aerop_propina: string;
  base_liquidacion: string;
  comision: string;
  retefuente: string;
  rete_iva: string;
  rete_ica: string;
  neto: string;
};

export type RedeBanDetail = RedeBanFile & {
  registros_redeban: RedeBanRow[]; // ← Cambio clave
};