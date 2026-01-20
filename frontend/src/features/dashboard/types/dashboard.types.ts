export interface DashboardKpis {
  totalVouchers: number;
  vouchersHoy: number;
  totalSucursales: number;
  sucursalesActivas: number;
  totalUsuarios: number;
  usuariosActivos: number;
  totalConciliaciones: number;
}

export interface VouchersPorSucursal {
  sucursal: string;
  total: number;
}

export interface VouchersPorMes {
  mes: string;
  total: number;
}

export interface EstadoVouchers {
  borradores: number;     // ← Cambio
  pendientes: number;     // ← Cambio
  confirmados: number;    // ← Cambio
}

export interface DashboardData {
  kpis: DashboardKpis;
  vouchersPorSucursal: VouchersPorSucursal[];
  vouchersPorMes: VouchersPorMes[];
  estadoVouchers: EstadoVouchers;
}