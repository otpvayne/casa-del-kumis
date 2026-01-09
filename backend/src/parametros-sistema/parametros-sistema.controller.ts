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

// ✅ Swagger
import {
  ApiBearerAuth,
  ApiBody,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Parámetros del Sistema')
@ApiBearerAuth()
@Controller('parametros-sistema')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ParametrosSistemaController {
  constructor(private readonly service: ParametrosSistemaService) {}

  // GET /parametros-sistema/active
  @Get('active')
  @Roles(
    Rol.ADMIN,
    Rol.PROPIETARIO,
    Rol.SOPORTE,
    Rol.DESARROLLADOR,
    Rol.OPERATIVO,
  )
  @ApiOperation({
    summary: 'Obtener parámetros activos (o defaults si no hay registro activo)',
  })
  @ApiResponse({
    status: 200,
    description: 'Parámetros activos (DB) o defaults si no existe ninguno',
    schema: {
      example: {
        id: '3',
        tasa_comision: 0.012,
        margen_error_permitido: 50,
        dias_desfase_banco: 1,
        activo: true,
        source: 'DB',
        created_at: '2025-12-30T00:00:00.000Z',
        updated_at: '2025-12-30T00:00:00.000Z',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  @ApiForbiddenResponse({ description: 'Token válido pero rol no permitido' })
  async active() {
    return this.service.getActive();
  }

  // GET /parametros-sistema
  @Get()
  @Roles(Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE, Rol.DESARROLLADOR)
  @ApiOperation({
    summary: 'Listar histórico de parámetros (últimos primero)',
  })
  @ApiResponse({
    status: 200,
    description: 'Listado de parámetros',
    schema: {
      example: [
        {
          id: '5',
          tasa_comision: 0.012,
          margen_error_permitido: 100,
          dias_desfase_banco: 1,
          activo: true,
          created_at: '2025-12-30T00:00:00.000Z',
          updated_at: '2025-12-30T00:00:00.000Z',
        },
        {
          id: '4',
          tasa_comision: 0.012,
          margen_error_permitido: 50,
          dias_desfase_banco: 1,
          activo: false,
          created_at: '2025-12-29T00:00:00.000Z',
          updated_at: '2025-12-29T00:00:00.000Z',
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  @ApiForbiddenResponse({ description: 'Token válido pero rol no permitido' })
  async list() {
    return this.service.list();
  }

  // POST /parametros-sistema
  @Post()
  @Roles(Rol.ADMIN, Rol.PROPIETARIO, Rol.DESARROLLADOR)
  @ApiOperation({
    summary:
      'Crear parámetros del sistema (si activo=true desactiva el anterior)',
  })
  @ApiBody({
    description:
      'Crea un nuevo set de parámetros. Si activo=true, desactiva el set anterior activo.',
    schema: {
      type: 'object',
      required: ['tasa_comision', 'margen_error_permitido', 'dias_desfase_banco'],
      properties: {
        tasa_comision: { type: 'number', example: 0.012 },
        margen_error_permitido: { type: 'number', example: 50 },
        dias_desfase_banco: { type: 'number', example: 1 },
        activo: { type: 'boolean', example: true },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Parámetros creados',
    schema: {
      example: {
        id: '6',
        tasa_comision: 0.012,
        margen_error_permitido: 50,
        dias_desfase_banco: 1,
        activo: true,
        created_at: '2026-01-09T00:00:00.000Z',
        updated_at: '2026-01-09T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos o faltantes (tasa_comision / margen_error_permitido / dias_desfase_banco)',
  })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  @ApiForbiddenResponse({ description: 'Token válido pero rol no permitido' })
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
  @ApiOperation({
    summary: 'Activar un set específico de parámetros por ID',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 6,
    description: 'ID del registro de parametros_sistema a activar',
  })
  @ApiResponse({
    status: 200,
    description: 'Parámetros activados',
    schema: {
      example: {
        id: '6',
        tasa_comision: 0.012,
        margen_error_permitido: 50,
        dias_desfase_banco: 1,
        activo: true,
        created_at: '2026-01-09T00:00:00.000Z',
        updated_at: '2026-01-09T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'parametros_sistema no existe',
  })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  @ApiForbiddenResponse({ description: 'Token válido pero rol no permitido' })
  async activate(@Param('id', ParseIntPipe) id: number) {
    return this.service.activate(id);
  }
}
