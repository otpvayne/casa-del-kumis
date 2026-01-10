export type VoucherEstado = "BORRADOR" | "PENDIENTE_CONFIRMACION" | "CONFIRMADO";

export type VoucherListItem = {
  id: string;
  estado: VoucherEstado;
  fecha_operacion: string;
  sucursal_id: string;
  total_visa: string;
  total_mastercard: string;
  total_global: string;
  created_at: string;
  sucursales?: { id: string; nombre: string };
};

export type VoucherTx = {
  id: string;
  franquicia: "VISA" | "MASTERCARD";
  ultimos_digitos: string | null;
  numero_recibo: string | null;
  monto: string;
  linea_ocr: string;
};

export type VoucherImagen = {
  id: string;
  ruta_imagen: string;
  orden: number;
  precision_ocr: string;
};

export type VoucherDetail = VoucherListItem & {
  voucher_transacciones: VoucherTx[];
  voucher_imagenes: VoucherImagen[];
};
