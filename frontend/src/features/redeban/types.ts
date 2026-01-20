export type RedeBanFile = {
  id: string; // BigInt serializado
  nombre_original: string;
  fecha_conciliacion: string; // ISO date string
  estado: 'CARGADO' | 'PROCESADO' | 'ERROR';
  hash_contenido?: string;
  ruta_archivo?: string;
  usuario_id?: string;
  created_at: string; // ISO date string
  updated_at?: string; // ISO date string
  _count?: {
    registros_redeban: number;
  };
};

export type RedeBanRow = {
  id: string; // BigInt serializado
  archivo_redeban_id: string;
  sucursal_id: string;
  codigo_comercio: string; // 10 dígitos
  direccion: string;
  cantidad_transacciones: number;
  
  // Valores monetarios (vienen como string de Prisma Decimal)
  // Formato: "12345.67"
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
  
  created_at?: string; // ISO date string
};

export type RedeBanDetail = RedeBanFile & {
  registros_redeban: RedeBanRow[];
};

// Tipo para la respuesta del upload
export type UploadRedeBanResponse = {
  archivo: RedeBanFile;
  totalFilas: number;
  sheetUsada: string;
  preview?: RedeBanRow[];
};