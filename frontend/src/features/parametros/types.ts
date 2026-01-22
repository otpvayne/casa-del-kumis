export type ParametrosSistema = {
  id: string; // BigInt serializado
  tasa_comision: string; // Decimal -> string
  margen_error_permitido: string; // Decimal -> string
  dias_desfase_banco: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateParametrosPayload = {
  tasa_comision: number; // 0.012
  margen_error_permitido: number; // 50
  dias_desfase_banco: number; // 1
};
