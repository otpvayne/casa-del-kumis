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
  };
  vouchersPorSucursal: Array<{
    sucursal: string;
    total: number;
  }>;
  vouchersPorMes: Array<{
    mes: string;
    total: number;
  }>;
  estadoVouchers: {
    confirmados: number;   // ✅ Correcto
    pendientes: number;    // ✅ Correcto
    borradores: number;    // ✅ Correcto
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
    // Obtener fecha de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // KPIs principales
    const [
      totalVouchers,
      vouchersHoy,
      totalSucursales,
      sucursalesActivas,
      totalUsuarios,
      usuariosActivos,
      totalConciliaciones,
    ] = await Promise.all([
      this.prisma.vouchers.count(),
      this.prisma.vouchers.count({
        where: {
          created_at: {
            gte: hoy,
          },
        },
      }),
      this.prisma.sucursales.count(),
      this.prisma.sucursales.count({
        where: { estado: 'ACTIVO' },
      }),
      this.prisma.usuarios.count(),
      this.prisma.usuarios.count({
        where: { estado: 'ACTIVO' },
      }),
      this.prisma.conciliaciones.count(),
    ]);

    // Vouchers por sucursal (top 10)
    const vouchersPorSucursalRaw = await this.prisma.vouchers.groupBy({
      by: ['sucursal_id'],
      _count: {
        id: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

    // Obtener nombres de sucursales
    const sucursalIds = vouchersPorSucursalRaw.map((v) => v.sucursal_id);
    const sucursales = await this.prisma.sucursales.findMany({
      where: {
        id: {
          in: sucursalIds,
        },
      },
      select: {
        id: true,
        nombre: true,
      },
    });

    const vouchersPorSucursal = vouchersPorSucursalRaw.map((v) => {
      const sucursal = sucursales.find((s) => s.id === v.sucursal_id);
      return {
        sucursal: sucursal?.nombre || 'Desconocida',
        total: v._count.id,
      };
    });

    // Vouchers por mes (últimos 6 meses)
    const seiseMesesAtras = new Date();
    seiseMesesAtras.setMonth(seiseMesesAtras.getMonth() - 6);

    // Opción 1: Usando Prisma.sql (recomendado)
    const vouchersPorMesRaw = await this.prisma.$queryRaw<VoucherPorMesRaw[]>(
      Prisma.sql`
        SELECT 
          TO_CHAR(created_at, 'YYYY-MM') as mes,
          COUNT(*)::bigint as total
        FROM vouchers
        WHERE created_at >= ${seiseMesesAtras}
        GROUP BY TO_CHAR(created_at, 'YYYY-MM')
        ORDER BY mes DESC
        LIMIT 6
      `
    );

    const mesesNombres = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];

    const vouchersPorMes = vouchersPorMesRaw
      .map((v) => {
        const [year, month] = v.mes.split('-');
        const mesNombre = mesesNombres[parseInt(month) - 1];
        return {
          mes: `${mesNombre} ${year}`,
          total: Number(v.total),
        };
      })
      .reverse();

    // Estado de vouchers (asumiendo que tienes un campo 'estado')
    // Si NO tienes este campo, comenta esta sección
    const estadoVouchers = {
  confirmados: await this.prisma.vouchers.count({
    where: { estado: 'CONFIRMADO' },
  }),
  pendientes: await this.prisma.vouchers.count({
    where: { estado: 'PENDIENTE_CONFIRMACION' },
  }),
  borradores: await this.prisma.vouchers.count({
    where: { estado: 'DRAFT' },
  }),
};

    return {
      kpis: {
        totalVouchers,
        vouchersHoy,
        totalSucursales,
        sucursalesActivas,
        totalUsuarios,
        usuariosActivos,
        totalConciliaciones,
      },
      vouchersPorSucursal,
      vouchersPorMes,
      estadoVouchers,
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