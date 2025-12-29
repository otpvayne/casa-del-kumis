// src/conciliacion/conciliacion.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '@prisma/client';

import { ConciliacionService } from './conciliacion.service';
import { GenerarConciliacionDto } from './dto/generar-conciliacion.dto';

@Controller('conciliaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConciliacionController {
  constructor(private readonly conciliacionService: ConciliacionService) {}

  // POST /conciliaciones/generar
  @Post('generar')
  @Roles(
    Rol.ADMIN,
    Rol.PROPIETARIO,
    Rol.SOPORTE,
    Rol.DESARROLLADOR,
    Rol.OPERATIVO,
  )
  async generar(@Body() body: GenerarConciliacionDto, @Req() req: any) {
    return this.conciliacionService.generarConciliacion({
      sucursalId: Number(body.sucursalId),
      fechaVentas: body.fechaVentas,
      userId: Number(req.user.sub),
      force: Boolean(body.force),
    });
  }

  // GET /conciliaciones/:id/resumen
  @Get(':id/resumen')
  @Roles(
    Rol.OPERATIVO,
    Rol.ADMIN,
    Rol.PROPIETARIO,
    Rol.SOPORTE,
    Rol.DESARROLLADOR,
  )
  async resumen(@Param('id', ParseIntPipe) id: number) {
    return this.conciliacionService.getResumen(id);
  }
}
