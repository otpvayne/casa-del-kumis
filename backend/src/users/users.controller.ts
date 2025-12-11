// backend/src/users/users.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // 📋 Listar todos los usuarios
  // PROPIETARIO, ADMIN, DESARROLLADOR y SOPORTE pueden ver
  @Get()
  @Roles(Rol.PROPIETARIO, Rol.ADMIN, Rol.DESARROLLADOR, Rol.SOPORTE)
  findAll() {
    return this.usersService.findAll();
  }

  // 👁 Ver un usuario por id
  @Get(':id')
  @Roles(Rol.PROPIETARIO, Rol.ADMIN, Rol.DESARROLLADOR, Rol.SOPORTE)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // ➕ Crear usuario (por ejemplo para nuevos operativos)
  @Post()
  @Roles(Rol.PROPIETARIO, Rol.ADMIN)
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // ✏️ Actualizar usuario (nombre, correo, rol, estado, contraseña)
  @Patch(':id')
  @Roles(Rol.PROPIETARIO, Rol.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  // 🚫 Desactivar usuario (no lo borramos, solo cambia estado)
  @Patch(':id/deactivate')
  @Roles(Rol.PROPIETARIO, Rol.ADMIN)
  deactivate(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.deactivate(id);
  }
}
