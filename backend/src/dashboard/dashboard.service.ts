import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infra/db/prisma.service';
import { Prisma } from '@prisma/client';

export interface DashboardData {
  kpis: {
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
  };

  vouchersPorSucursal: Array<{ sucursal: string; total: number }>;
  vouchersPorMes: Array<{ mes: string; total: number }>;

  estadoVouchers: {
    confirmados: number;
    pendientes: number;
    borradores: number;
  };

  actividadPorModulo: Array<{ name: string; total: number }>;
  estadoConciliaciones: {
    generadas: number;
    otras: number;
  };
}


interface VoucherPorMesRaw {
  mes: string;
  total: bigint;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardData(): Promise<DashboardData> {
  // Hoy (inicio de día local del server). Si tu server corre en UTC, ajusta a UTC.
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const seisMesesAtras = new Date();
  seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

  // KPIs principales + banco/redeban/conciliaciones
  const [
    totalVouchers,
    vouchersHoy,

    totalSucursales,
    sucursalesActivas,

    totalUsuarios,
    usuariosActivos,

    totalConciliaciones,
    conciliacionesHoy,

    totalRedeBanArchivos,
    redebanHoy,

    totalBancoArchivos,
    bancoHoy,

    // Conciliaciones fuera de margen:
    conciliacionesConDiferencia,

    // Estado conciliaciones:
    conciliacionesGeneradas,
  ] = await Promise.all([
    this.prisma.vouchers.count(),
    this.prisma.vouchers.count({ where: { created_at: { gte: hoy } } }),

    this.prisma.sucursales.count(),
    this.prisma.sucursales.count({ where: { estado: 'ACTIVO' } }),

    this.prisma.usuarios.count(),
    this.prisma.usuarios.count({ where: { estado: 'ACTIVO' } }),

    this.prisma.conciliaciones.count(),
    this.prisma.conciliaciones.count({ where: { created_at: { gte: hoy } } }),

    this.prisma.archivos_redeban.count(),
    this.prisma.archivos_redeban.count({ where: { created_at: { gte: hoy } } }),

    this.prisma.archivos_banco.count(),
    this.prisma.archivos_banco.count({ where: { created_at: { gte: hoy } } }),

    // Fuera de margen: ABS(diferencia_calculada) > margen_permitido
    // Nota: diferencia_calculada/margen_permitido son Decimal? => filtra NOT NULL
    this.prisma.conciliaciones.count({
      where: {
        diferencia_calculada: { not: null },
        margen_permitido: { not: null },
        // Prisma no soporta ABS directo en where, entonces lo hacemos con raw:
      } as any,
    }).then(async () => {
      // raw para hacerlo bien
      const rows = await this.prisma.$queryRaw<{ total: bigint }[]>(
        Prisma.sql`
          SELECT COUNT(*)::bigint as total
          FROM conciliaciones
          WHERE diferencia_calculada IS NOT NULL
            AND margen_permitido IS NOT NULL
            AND ABS(diferencia_calculada) > margen_permitido
        `,
      );
      return Number(rows?.[0]?.total ?? 0);
    }),

    this.prisma.conciliaciones.count({ where: { estado: 'GENERADA' } }),
  ]);

  const conciliacionesOtras = totalConciliaciones - conciliacionesGeneradas;

  // Vouchers por sucursal (top 10)
  const vouchersPorSucursalRaw = await this.prisma.vouchers.groupBy({
    by: ['sucursal_id'],
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 10,
  });

  const sucursalIds = vouchersPorSucursalRaw.map((v) => v.sucursal_id);
  const sucursales = await this.prisma.sucursales.findMany({
    where: { id: { in: sucursalIds } },
    select: { id: true, nombre: true },
  });

  const vouchersPorSucursal = vouchersPorSucursalRaw.map((v) => {
    const suc = sucursales.find((s) => s.id === v.sucursal_id);
    return { sucursal: suc?.nombre || 'Desconocida', total: v._count.id };
  });

  // Vouchers por mes (últimos 6)
  const vouchersPorMesRaw = await this.prisma.$queryRaw<VoucherPorMesRaw[]>(
    Prisma.sql`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as mes,
        COUNT(*)::bigint as total
      FROM vouchers
      WHERE created_at >= ${seisMesesAtras}
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY mes DESC
      LIMIT 6
    `,
  );

  const mesesNombres = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
  ];

  const vouchersPorMes = vouchersPorMesRaw
    .map((v) => {
      const [year, month] = v.mes.split('-');
      const mesNombre = mesesNombres[parseInt(month, 10) - 1];
      return { mes: `${mesNombre} ${year}`, total: Number(v.total) };
    })
    .reverse();

  // Estado vouchers
  const estadoVouchers = {
    confirmados: await this.prisma.vouchers.count({ where: { estado: 'CONFIRMADO' } }),
    pendientes: await this.prisma.vouchers.count({ where: { estado: 'PENDIENTE_CONFIRMACION' } }),
    borradores: await this.prisma.vouchers.count({ where: { estado: 'DRAFT' } }),
  };

  // Actividad por módulo
  const actividadPorModulo = [
    { name: 'Vouchers', total: totalVouchers },
    { name: 'RedeBan', total: totalRedeBanArchivos },
    { name: 'Banco', total: totalBancoArchivos },
    { name: 'Conciliaciones', total: totalConciliaciones },
  ];

  return {
    kpis: {
      totalVouchers,
      vouchersHoy,

      totalSucursales,
      sucursalesActivas,

      totalUsuarios,
      usuariosActivos,

      totalConciliaciones,
      conciliacionesHoy,
      conciliacionesConDiferencia,

      totalRedeBanArchivos,
      redebanHoy,

      totalBancoArchivos,
      bancoHoy,
    },

    vouchersPorSucursal,
    vouchersPorMes,
    estadoVouchers,

    actividadPorModulo,
    estadoConciliaciones: {
      generadas: conciliacionesGeneradas,
      otras: conciliacionesOtras,
    },
  };
}


  async getStatsBySucursal() {
    const stats = await this.prisma.sucursales.findMany({
      select: {
        id: true,
        nombre: true,
        estado: true,
        _count: {
          select: {
            vouchers: true,
            conciliaciones: true,
          },
        },
      },
      orderBy: {
        nombre: 'asc',
      },
    });

    return stats.map((s) => ({
      id: s.id.toString(),
      nombre: s.nombre,
      estado: s.estado,
      totalVouchers: s._count.vouchers,
      totalConciliaciones: s._count.conciliaciones,
    }));
  }
}