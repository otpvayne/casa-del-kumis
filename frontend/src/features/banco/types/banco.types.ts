// Archivo completo del banco (según tu backend)
export type ArchivoBanco = {
  id: string; // BigInt serializado
  fecha_archivo: string;
  nombre_original: string;
  ruta_archivo?: string;
  hash_contenido?: string;
  estado: string; // CARGADO, PROCESADO, ERROR
  usuario_id?: string;
  created_at: string;
};

// Detalle de transacciones del archivo
export type RegistroBancoDetalle = {
  id: string;
  archivo_banco_id: string;
  sucursal_id: string | null;
  
  // Fechas
  fecha_vale: string | null;
  fecha_proceso: string | null;
  fecha_abono: string | null;
  
  // Identificadores
  bol_ruta: string | null;
  recap: string | null;
  vale: string | null;
  red: string | null;
  terminal: string | null;
  numero_autoriza: string | null;
  
  // Valores (vienen como Decimal/string del backend)
  valor_consumo: string | null;
  valor_iva: string | null;
  imp_al_consumo: string | null;
  valor_propina: string | null;
  valor_comision: string | null;
  ret_fuente: string | null;
  ret_iva: string | null;
  ret_ica: string | null;
  valor_neto: string | null;
  bases_dev_iva: string | null;
  
  hora_trans: string | null;
  
  // Tarjeta
  tarjeta_socio: string | null;
  franquicia: "VISA" | "MASTERCARD" | "DESCONOCIDA";
  tipo_tarjeta: "CREDIT" | "DEBIT" | "DESCONOCIDO";
  
  created_at: string;
};

// Response del upload (según tu backend)
export type BancoUploadResponse = {
  archivo: ArchivoBanco;
  sucursal: {
    id: string;
    nombre: string;
  };
  sheetUsada: string;
  totalFilas: number;
  preview: any[];
};