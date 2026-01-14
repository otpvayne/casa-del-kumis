import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Res,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '@prisma/client';
import type { Response } from "express";
import { VouchersService } from './vouchers.service';
import { UpdateVoucherDraftDto } from './dto/update-voucher-draft.dto';
import { multerVoucherTmpConfig } from './multer-vouchers.config';

// ✅ Swagger
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

@ApiTags('Vouchers')
@ApiBearerAuth()
@Controller('vouchers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  // ===========================
  // ✅ (LEGACY) 1 imagen = 1 voucher
  // ===========================
  @Post('upload')
  @Roles(Rol.OPERATIVO, Rol.ADMIN, Rol.PROPIETARIO)
  @UseInterceptors(FileInterceptor('image', multerVoucherTmpConfig))
  @ApiOperation({
    summary: '(Legacy) Subir 1 imagen y crear 1 voucher automáticamente',
    description:
      'Crea el voucher y procesa OCR con una sola imagen. Recomendado solo para vouchers pequeños.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'form-data: image + sucursalId + fechaOperacion',
    schema: {
      type: 'object',
      required: ['image', 'sucursalId', 'fechaOperacion'],
      properties: {
        image: { type: 'string', format: 'binary' },
        sucursalId: { type: 'string', example: '8' },
        fechaOperacion: { type: 'string', example: '2025-12-22' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Voucher creado y procesado',
    schema: {
      example: {
        id: '49',
        sucursal_id: '8',
        fecha_operacion: '2025-12-22T00:00:00.000Z',
        estado: 'PENDIENTE_CONFIRMACION',
        precision_ocr: '75',
        total_visa: '152200',
        total_mastercard: '213900',
        total_global: '366100',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos o falta archivo' })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  @ApiForbiddenResponse({ description: 'Token válido pero rol no permitido' })
  async uploadVoucher(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { sucursalId: string; fechaOperacion: string },
    @Req() req: any,
  ) {
    return this.vouchersService.uploadAndProcess({
      file,
      sucursalId: Number(body.sucursalId),
      fechaOperacion: body.fechaOperacion,
      userId: Number(req.user.sub),
    });
  }

  // ===========================
  // ✅ NUEVO: crear voucher draft (sin imagen)
  // ===========================
  @Post('draft')
  @Roles(Rol.OPERATIVO, Rol.ADMIN, Rol.PROPIETARIO)
  @ApiOperation({
    summary: 'Crear voucher en estado borrador (sin imágenes)',
    description:
      'Crea el voucher base para luego adjuntar 1..N imágenes (multi-imagen) y correr OCR por partes.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['sucursalId', 'fechaOperacion'],
      properties: {
        sucursalId: { type: 'number', example: 8 },
        fechaOperacion: { type: 'string', example: '2025-12-22' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Voucher draft creado',
    schema: {
      example: {
        id: '50',
        sucursal_id: '8',
        fecha_operacion: '2025-12-22T00:00:00.000Z',
        estado: 'DRAFT',
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  @ApiForbiddenResponse({ description: 'Token válido pero rol no permitido' })
  async createDraft(
    @Body() body: { sucursalId: number; fechaOperacion: string },
    @Req() req: any,
  ) {
    return this.vouchersService.createDraft({
      sucursalId: Number(body.sucursalId),
      fechaOperacion: body.fechaOperacion,
      userId: Number(req.user.sub),
    });
  }

  // ===========================
  // ✅ NUEVO: subir UNA imagen al voucher (multi-imagen)
  // form-data: image + (opcional) orden
  // ===========================
  @Post(':id/imagenes')
  @Roles(Rol.OPERATIVO, Rol.ADMIN, Rol.PROPIETARIO)
  @UseInterceptors(FileInterceptor('image', multerVoucherTmpConfig))
  @ApiOperation({
    summary: 'Agregar una imagen a un voucher existente (multi-imagen)',
    description:
      'Sube una imagen y la asocia al voucher. Puede (según tu service) ejecutar OCR parcial y mergear transacciones/totales.',
  })
  @ApiParam({
    name: 'id',
    type: Number,
    example: 49,
    description: 'ID del voucher al que se le agrega la imagen',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'form-data: image + (opcional) orden',
    schema: {
      type: 'object',
      required: ['image'],
      properties: {
        image: { type: 'string', format: 'binary' },
        orden: { type: 'string', example: '2' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Imagen agregada (y voucher actualizado si corre OCR)',
    schema: {
      example: {
        ok: true,
        voucherId: '49',
        imagen: {
          id: '2',
          orden: 2,
          precision_ocr: '72',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos / falta imagen' })
  @ApiResponse({ status: 404, description: 'Voucher no encontrado' })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  @ApiForbiddenResponse({ description: 'Token válido pero rol no permitido' })
  async addImagen(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { orden?: string },
    @Req() req: any,
  ) {
    return this.vouchersService.addImagen({
      voucherId: Number(id),
      file,
      orden: body.orden ? Number(body.orden) : undefined,
      userId: Number(req.user.sub),
    });
  }

  // ✅ Ver voucher + transacciones + imágenes
  @Get(':id')
  @Roles(
    Rol.OPERATIVO,
    Rol.ADMIN,
    Rol.PROPIETARIO,
    Rol.DESARROLLADOR,
    Rol.SOPORTE,
  )
  @ApiOperation({
    summary: 'Obtener voucher por ID (incluye transacciones + imágenes)',
  })
  @ApiParam({ name: 'id', type: Number, example: 49 })
  @ApiResponse({
    status: 200,
    description: 'Voucher completo con sus relaciones',
  })
  @ApiResponse({ status: 404, description: 'Voucher no encontrado' })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  @ApiForbiddenResponse({ description: 'Token válido pero rol no permitido' })
  async getVoucher(@Param('id', ParseIntPipe) id: number) {
    return this.vouchersService.getVoucher(id);
  }

  @Patch(':id/draft')
  @Roles(Rol.OPERATIVO, Rol.ADMIN, Rol.PROPIETARIO)
  @ApiOperation({
    summary:
      'Actualizar voucher en borrador (totales y/o reemplazar transacciones)',
    description:
      'Si envías "transacciones", se reemplazan todas. También puedes corregir totales manualmente.',
  })
  @ApiParam({ name: 'id', type: Number, example: 49 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        totalVisa: { type: 'number', example: 152200 },
        totalMastercard: { type: 'number', example: 213900 },
        totalGlobal: { type: 'number', example: 366100 },
        observacion: { type: 'string', example: 'Corrección manual OCR' },
        transacciones: {
          type: 'array',
          items: {
            type: 'object',
            required: ['franquicia', 'monto'],
            properties: {
              franquicia: { type: 'string', example: 'VISA' },
              ultimos_digitos: { type: 'string', example: '9801' },
              numero_recibo: { type: 'string', example: '001530' },
              monto: { type: 'number', example: 11000 },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Voucher actualizado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiResponse({ status: 404, description: 'Voucher no encontrado' })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  @ApiForbiddenResponse({ description: 'Token válido pero rol no permitido' })
  async updateVoucherDraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateVoucherDraftDto,
  ) {
    return this.vouchersService.updateVoucherDraft(id, body);
  }

  @Post(':id/confirm')
  @Roles(Rol.ADMIN, Rol.PROPIETARIO, Rol.OPERATIVO)
  @ApiOperation({
    summary: 'Confirmar voucher (cierra el proceso)',
    description:
      'Marca el voucher como CONFIRMADO y registra el usuario que confirma. Puede ajustar totales finales.',
  })
  @ApiParam({ name: 'id', type: Number, example: 49 })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        totalVisa: { type: 'number', example: 152200 },
        totalMastercard: { type: 'number', example: 213900 },
        totalGlobal: { type: 'number', example: 366100 },
        observacion: { type: 'string', example: 'Confirmado por operativo' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Voucher confirmado' })
  @ApiResponse({ status: 404, description: 'Voucher no encontrado' })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  @ApiForbiddenResponse({ description: 'Token válido pero rol no permitido' })
  async confirmVoucher(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      totalVisa?: number;
      totalMastercard?: number;
      totalGlobal?: number;
      observacion?: string;
    },
    @Req() req: any,
  ) {
    return this.vouchersService.confirmVoucher(id, Number(req.user.sub), body);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.DESARROLLADOR, Rol.PROPIETARIO)
  @ApiOperation({
    summary: 'Eliminar voucher (solo para limpieza/pruebas)',
  })
  @ApiParam({ name: 'id', type: Number, example: 49 })
  @ApiResponse({ status: 200, description: 'Voucher eliminado' })
  @ApiResponse({ status: 404, description: 'Voucher no encontrado' })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  @ApiForbiddenResponse({ description: 'Token válido pero rol no permitido' })
  async deleteVoucher(@Param('id', ParseIntPipe) id: number) {
    return this.vouchersService.deleteVoucher(id);
  }
  // LISTAR vouchers (para frontend)
@Get()
@Roles(
  Rol.OPERATIVO,
  Rol.ADMIN,
  Rol.PROPIETARIO,
  Rol.DESARROLLADOR,
  Rol.SOPORTE,
)
async listVouchers() {
  return this.vouchersService.listVouchers();
}
@Get("imagenes/:imageId/file")
@Roles(Rol.OPERATIVO, Rol.ADMIN, Rol.PROPIETARIO, Rol.DESARROLLADOR, Rol.SOPORTE)
async getVoucherImageFile(
  @Param("imageId", ParseIntPipe) imageId: number,
  @Res() res: Response,
) {
  const filePath = await this.vouchersService.getVoucherImagePath(imageId);
  return res.sendFile(filePath);
}

}
