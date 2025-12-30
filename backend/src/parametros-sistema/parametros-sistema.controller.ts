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

import { ParametrosSistemaService } from './parametros-sistema.service';
import { CreateParametrosSistemaDto } from './dto/create-parametros-sistema.dto';

@Controller('parametros-sistema')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParametrosSistemaController {
  constructor(private readonly service: ParametrosSistemaService) {}

  // GET /parametros-sistema/active
  @Get('active')
  @Roles(Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE, Rol.DESARROLLADOR, Rol.OPERATIVO)
  async active() {
    return this.service.getActive();
  }

  // GET /parametros-sistema
  @Get()
  @Roles(Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE, Rol.DESARROLLADOR)
  async list() {
    return this.service.list();
  }

  // POST /parametros-sistema
  @Post()
  @Roles(Rol.ADMIN, Rol.PROPIETARIO, Rol.DESARROLLADOR)
  async create(@Body() body: CreateParametrosSistemaDto, @Req() req: any) {
    return this.service.create({
      tasa_comision: Number(body.tasa_comision),
      margen_error_permitido: Number(body.margen_error_permitido),
      dias_desfase_banco: Number(body.dias_desfase_banco),
      activo: body.activo ?? true,
      userId: Number(req.user.sub),
    });
  }

  // POST /parametros-sistema/:id/activate
  @Post(':id/activate')
  @Roles(Rol.ADMIN, Rol.PROPIETARIO, Rol.DESARROLLADOR)
  async activate(@Param('id', ParseIntPipe) id: number) {
    return this.service.activate(id);
  }
}
