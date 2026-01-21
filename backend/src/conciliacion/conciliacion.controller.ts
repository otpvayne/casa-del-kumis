// src/conciliacion/conciliacion.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Delete,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '@prisma/client';

import { ConciliacionService } from './conciliacion.service';
import { GenerarConciliacionDto } from './dto/generar-conciliacion.dto';

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

@ApiTags('Conciliaciones')
@ApiBearerAuth()
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
  @ApiOperation({
    summary:
      'Generar conciliación por sucursal y fecha (match voucher vs banco vs redeban)',
  })
  @ApiBody({
    description:
      'Genera (o recalcula) la conciliación diaria. Si force=true recalcula aunque exista.',
    schema: {
      type: 'object',
      required: ['sucursalId', 'fechaVentas'],
      properties: {
        sucursalId: { type: 'number', example: 8 },
        fechaVentas: { type: 'string', example: '2025-12-22' },
        force: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Conciliación generada correctamente',
    schema: {
      example: {
        params: {
          tasa_comision: 0.012,
          margen_error_permitido: 50,
          dias_desfase_banco: 1,
        },
        resumen: {
          sucursalId: 8,
          fechaVentas: '2025-12-22',
          voucherId: '47',
          totalVisaVoucher: 152200,
          totalMcVoucher: 213900,
          totalGlobalVoucher: 366100,
          baseLiquidacionRedeBan: 338981,
          totalBancoAjustado: 362033,
          comisionEsperadaTotal: 4067.77,
          diferenciaCalculada: 0.77,
          matchStats: {
            totalVoucherTx: 16,
            totalBancoTx: 16,
            matchOk: 15,
            abonoDiaSiguiente: 15,
            comisionIncorrecta: 0,
            valorDiferente: 0,
            sinBanco: 1,
            sinVoucher: 1,
            totalGeneradas: 17,
          },
          causaPrincipal: 'SIN_BANCO',
        },
        conciliacion: {
          id: '2',
          sucursal_id: '8',
          fecha_ventas: '2025-12-22T00:00:00.000Z',
          voucher_id: '47',
          archivo_redeban_id: '3',
          archivo_banco_id: '2',
          estado: 'GENERADA',
          diferencia_calculada: '0.77',
          margen_permitido: '50',
          causa_principal: 'SIN_BANCO',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Datos inválidos (faltan campos, formato fecha inválido, etc.)',
  })
  @ApiResponse({
    status: 404,
    description:
      'No se encuentran insumos necesarios (voucher, archivo banco o redeban, sucursal, etc.)',
  })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  @ApiForbiddenResponse({ description: 'Token válido pero rol no permitido' })
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
  @ApiOperation({
    summary:
      'Resumen de conciliación (conteos por estado, SIN_BANCO, SIN_VOUCHER, top diferencias comisión)',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 2,
    description: 'ID de la conciliación',
  })
  @ApiResponse({
    status: 200,
    description: 'Resumen de conciliación',
    schema: {
      example: {
        conciliacionId: 2,
        conteoPorEstado: {
          MATCH_OK: 15,
          ABONO_DIA_SIGUIENTE: 15,
          SIN_BANCO: 1,
          SIN_VOUCHER: 1,
          COMISION_INCORRECTA: 0,
          VALOR_DIFERENTE: 0,
          NO_ABONADO: 0,
          PENDIENTE_REVISION: 0,
        },
        sinBanco: [
          {
            id: '31',
            voucher_tx_id: '431',
            ultimos_digitos: '0801',
            monto_voucher: '11000',
            observacion:
              'No se encontró transacción banco con mismo last4 + monto (consumo+imp)',
          },
        ],
        sinVoucher: [
          {
            id: '34',
            banco_detalle_id: '49',
            ultimos_digitos: '9801',
            valor_neto_banco: '10878',
            observacion: 'Existe en banco pero no en voucher (mismo día)',
          },
        ],
        topDiferenciasComision: [
          {
            id: '18',
            ultimos_digitos: '0685',
            comision_banco: '144',
            comision_esperada: '144.44',
            diferencia_comision: '0.44',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Conciliación no existe' })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  @ApiForbiddenResponse({ description: 'Token válido pero rol no permitido' })
  async resumen(@Param('id', ParseIntPipe) id: number) {
    return this.conciliacionService.getResumen(id);
  }
  // GET /conciliaciones
@Get()
@Roles(
  Rol.OPERATIVO,
  Rol.ADMIN,
  Rol.PROPIETARIO,
  Rol.SOPORTE,
  Rol.DESARROLLADOR,
)
@ApiOperation({ summary: 'Listar todas las conciliaciones' })
@ApiResponse({
  status: 200,
  description: 'Lista de conciliaciones',
})
@ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
async list() {
  return this.conciliacionService.listConciliaciones();
}

// GET /conciliaciones/:id
@Get(':id')
@Roles(
  Rol.OPERATIVO,
  Rol.ADMIN,
  Rol.PROPIETARIO,
  Rol.SOPORTE,
  Rol.DESARROLLADOR,
)
@ApiOperation({ summary: 'Obtener conciliación por ID' })
@ApiParam({ name: 'id', type: Number, example: 1 })
@ApiResponse({ status: 200, description: 'Conciliación encontrada' })
@ApiResponse({ status: 404, description: 'Conciliación no encontrada' })
@ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
async getById(@Param('id', ParseIntPipe) id: number) {
  return this.conciliacionService.getConciliacionById(id);
}

// DELETE /conciliaciones/:id
@Delete(':id')
@Roles(Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE, Rol.DESARROLLADOR)
@ApiOperation({ summary: 'Eliminar conciliación y sus transacciones' })
@ApiParam({ name: 'id', type: Number, example: 1 })
@ApiResponse({
  status: 200,
  description: 'Conciliación eliminada',
})
@ApiResponse({ status: 404, description: 'Conciliación no encontrada' })
@ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
@ApiForbiddenResponse({ description: 'Rol no permitido' })
async delete(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
  return this.conciliacionService.deleteConciliacion(id, req.user.sub);
}
}
