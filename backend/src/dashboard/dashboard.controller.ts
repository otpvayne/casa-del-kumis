import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '@prisma/client';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  @Roles(Rol.PROPIETARIO, Rol.ADMIN, Rol.DESARROLLADOR, Rol.SOPORTE)
  @ApiOperation({
    summary: 'Obtener datos del dashboard',
    description: 'Estadísticas generales del sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Datos del dashboard',
    schema: {
      example: {
        kpis: {
          totalVouchers: 150,
          vouchersHoy: 12,
          totalSucursales: 8,
          sucursalesActivas: 7,
          totalUsuarios: 15,
          usuariosActivos: 12,
          totalConciliaciones: 45,
        },
        vouchersPorSucursal: [
          { sucursal: 'Centro', total: 50 },
          { sucursal: 'Norte', total: 35 },
        ],
        vouchersPorMes: [
          { mes: 'Enero', total: 45 },
          { mes: 'Febrero', total: 52 },
        ],
        estadoVouchers: {
          pendientes: 10,
          completados: 120,
          errores: 5,
        },
      },
    },
  })
  getDashboard() {
    return this.service.getDashboardData();
  }

  @Get('stats/sucursales')
  @Roles(Rol.PROPIETARIO, Rol.ADMIN, Rol.DESARROLLADOR, Rol.SOPORTE)
  @ApiOperation({
    summary: 'Estadísticas por sucursal',
  })
  getStatsBySucursal() {
    return this.service.getStatsBySucursal();
  }
}