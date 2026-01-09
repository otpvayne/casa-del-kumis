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

// Swagger
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Sucursales')
@ApiBearerAuth()
@Controller('sucursales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SucursalesController {
  constructor(private readonly service: SucursalesService) {}

  // ===========================
  // GET /sucursales
  // ===========================
  @Get()
  @Roles(Rol.PROPIETARIO, Rol.ADMIN, Rol.DESARROLLADOR, Rol.SOPORTE)
  @ApiOperation({
    summary: 'Listar sucursales',
    description:
      'Devuelve todas las sucursales registradas. No incluye OPERATIVO.',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de sucursales',
    schema: {
      example: [
        {
          id: '8',
          nombre: 'CASA DEL KUMIS CENTRO',
          codigo_comercio_redeban: '0063286892',
          codigo_referencia_banco: '0063286892',
          direccion: 'CALLE 38 31 A 10',
          estado: 'ACTIVA',
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado' })
  findAll() {
    return this.service.findAll();
  }

  // ===========================
  // GET /sucursales/:id
  // ===========================
  @Get(':id')
  @Roles(Rol.PROPIETARIO, Rol.ADMIN, Rol.DESARROLLADOR, Rol.SOPORTE)
  @ApiOperation({
    summary: 'Obtener sucursal por ID',
  })
  @ApiParam({
    name: 'id',
    example: 8,
    description: 'ID de la sucursal',
  })
  @ApiResponse({
    status: 200,
    description: 'Sucursal encontrada',
    schema: {
      example: {
        id: '8',
        nombre: 'CASA DEL KUMIS CENTRO',
        codigo_comercio_redeban: '0063286892',
        codigo_referencia_banco: '0063286892',
        direccion: 'CALLE 38 31 A 10',
        estado: 'ACTIVA',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // ===========================
  // POST /sucursales
  // ===========================
  @Post()
  @Roles(Rol.PROPIETARIO, Rol.ADMIN)
  @ApiOperation({
    summary: 'Crear sucursal',
    description:
      'Crea una nueva sucursal. Solo PROPIETARIO y ADMIN pueden hacerlo.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['nombre', 'codigo_comercio_redeban', 'codigo_referencia_banco'],
      properties: {
        nombre: { type: 'string', example: 'CASA DEL KUMIS NORTE' },
        codigo_comercio_redeban: { type: 'string', example: '0099887766' },
        codigo_referencia_banco: { type: 'string', example: '0099887766' },
        direccion: { type: 'string', example: 'Cra 15 #93-60' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Sucursal creada correctamente',
  })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado' })
  create(@Body() dto: CreateSucursalDto) {
    return this.service.create(dto);
  }

  // ===========================
  // PATCH /sucursales/:id
  // ===========================
  @Patch(':id')
  @Roles(Rol.PROPIETARIO, Rol.ADMIN)
  @ApiOperation({
    summary: 'Actualizar sucursal',
    description:
      'Edita los datos de una sucursal existente. No elimina registros históricos.',
  })
  @ApiParam({
    name: 'id',
    example: 8,
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        nombre: { type: 'string', example: 'CASA DEL KUMIS CENTRO (EDITADO)' },
        direccion: { type: 'string', example: 'Nueva dirección' },
        estado: { type: 'string', example: 'ACTIVA' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Sucursal actualizada',
  })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado' })
  update(@Param('id') id: string, @Body() dto: UpdateSucursalDto) {
    return this.service.update(id, dto);
  }

  // ===========================
  // PATCH /sucursales/:id/deactivate
  // ===========================
  @Patch(':id/deactivate')
  @Roles(Rol.PROPIETARIO, Rol.ADMIN)
  @ApiOperation({
    summary: 'Desactivar sucursal',
    description:
      'Marca la sucursal como INACTIVA. No borra datos ni afecta conciliaciones pasadas.',
  })
  @ApiParam({
    name: 'id',
    example: 8,
  })
  @ApiResponse({
    status: 200,
    description: 'Sucursal desactivada',
  })
  @ApiResponse({ status: 404, description: 'Sucursal no encontrada' })
  @ApiUnauthorizedResponse({ description: 'Token faltante o inválido' })
  @ApiForbiddenResponse({ description: 'Rol no autorizado' })
  deactivate(@Param('id') id: string) {
    return this.service.deactivate(id);
  }
}
