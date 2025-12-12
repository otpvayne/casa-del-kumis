import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SucursalesService } from './sucursales.service';
import { CreateSucursalDto } from './dto/create-sucursal.dto';
import { UpdateSucursalDto } from './dto/update-sucursal.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '@prisma/client';

@Controller('sucursales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SucursalesController {
  constructor(private readonly service: SucursalesService) {}

  // Ver sucursales (casi todos menos OPERATIVO si quieres)
  @Get()
  @Roles(Rol.PROPIETARIO, Rol.ADMIN, Rol.DESARROLLADOR, Rol.SOPORTE)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Rol.PROPIETARIO, Rol.ADMIN, Rol.DESARROLLADOR, Rol.SOPORTE)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // Crear / editar sucursales: PROPIETARIO y ADMIN
  @Post()
  @Roles(Rol.PROPIETARIO, Rol.ADMIN)
  create(@Body() dto: CreateSucursalDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Rol.PROPIETARIO, Rol.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateSucursalDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(Rol.PROPIETARIO, Rol.ADMIN)
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
