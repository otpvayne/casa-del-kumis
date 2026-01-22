export interface DashboardKpis {
  totalVouchers: number;
  vouchersHoy: number;

  totalSucursales: number;
  sucursalesActivas: number;

  totalUsuarios: number;
  usuariosActivos: number;

  totalConciliaciones: number;
  conciliacionesHoy: number;
  conciliacionesConDiferencia: number;

  totalRedeBanArchivos: number;
  redebanHoy: number;

  totalBancoArchivos: number;
  bancoHoy: number;
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
  borradores: number;
  pendientes: number;
  confirmados: number;
}

export interface ActividadPorModulo {
  name: string;
  total: number;
}

export interface EstadoConciliaciones {
  generadas: number;
  otras: number;
}

export interface DashboardData {
  kpis: DashboardKpis;
  vouchersPorSucursal: VouchersPorSucursal[];
  vouchersPorMes: VouchersPorMes[];
  estadoVouchers: EstadoVouchers;

  actividadPorModulo: ActividadPorModulo[];
  estadoConciliaciones: EstadoConciliaciones;
}
