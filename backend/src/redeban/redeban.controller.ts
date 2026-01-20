// src/redeban/redeban.controller.ts
import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Delete,
  BadRequestException,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '@prisma/client';

import { RedeBanService } from './redeban.service';
import { UploadRedebanDto } from './dto/upload-redeban.dto';

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

function filenameFactory(_req: any, file: Express.Multer.File, cb: any) {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  cb(null, `${unique}${extname(file.originalname)}`);
}

@ApiTags('RedeBan')
@ApiBearerAuth()
@Controller('redeban')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RedeBanController {
  constructor(private readonly redebanService: RedeBanService) {}

  @Post('upload')
  @Roles(Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE, Rol.DESARROLLADOR)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/redeban',
        filename: filenameFactory,
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
      fileFilter: (_req, file, cb) => {
        const allowed = [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ];
        if (allowed.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Solo se permiten archivos .xls o .xlsx'), false);
        }
      },
    }),
  )
  @ApiOperation({ summary: 'Subir y procesar archivo RedeBan (XLS/XLSX)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Carga de archivo RedeBan + fecha de conciliación',
    schema: {
      type: 'object',
      required: ['file', 'fechaConciliacion'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo .xls o .xlsx',
        },
        fechaConciliacion: {
          type: 'string',
          example: '2025-12-22',
          description: 'Fecha conciliación (YYYY-MM-DD)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Archivo cargado y procesado',
    schema: {
      example: {
        archivo: {
          id: '3',
          fecha_conciliacion: '2025-12-22T00:00:00.000Z',
          nombre_original: 'ReporteDiariodeVentasComercio2025-12-22.xls',
          ruta_archivo: '.../uploads/redeban/2025-12-22/xxxx.xls',
          hash_contenido: '3b3d...51d9',
          estado: 'PROCESADO',
          usuario_id: '1',
          created_at: '2025-12-24T16:20:42.713Z',
        },
        totalFilas: 15,
        sheetUsada: 'Movimientos',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Faltan campos / archivo inválido / formato no soportado',
  })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  @ApiForbiddenResponse({ description: 'Token válido pero rol no permitido' })
  async uploadRedeBan(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadRedebanDto,
    @Req() req: any,
  ) {
    if (!file) {
      throw new BadRequestException('Debes proporcionar un archivo');
    }

    return this.redebanService.uploadAndProcess({
      file,
      fechaConciliacion: body.fechaConciliacion,
      userId: Number(req.user.sub),
    });
  }

  @Get()
  @Roles(
    Rol.OPERATIVO,
    Rol.ADMIN,
    Rol.PROPIETARIO,
    Rol.SOPORTE,
    Rol.DESARROLLADOR,
  )
  @ApiOperation({ summary: 'Listar archivos RedeBan cargados' })
  @ApiResponse({
    status: 200,
    description: 'Lista de archivos RedeBan',
    schema: {
      example: [
        {
          id: '3',
          fecha_conciliacion: '2025-12-22T00:00:00.000Z',
          nombre_original: 'ReporteDiariodeVentasComercio2025-12-22.xls',
          estado: 'PROCESADO',
          created_at: '2025-12-24T16:20:42.713Z',
          _count: {
            registros_redeban: 15,
          },
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  async list() {
    return this.redebanService.listArchivos();
  }

  @Get(':id')
  @Roles(
    Rol.OPERATIVO,
    Rol.ADMIN,
    Rol.PROPIETARIO,
    Rol.SOPORTE,
    Rol.DESARROLLADOR,
  )
  @ApiOperation({ summary: 'Obtener detalle de un archivo RedeBan por ID' })
  @ApiParam({ name: 'id', type: Number, example: 3 })
  @ApiResponse({
    status: 200,
    description: 'Archivo RedeBan encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe el archivo RedeBan con ese ID',
  })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.redebanService.getArchivoById(id);
  }

  @Delete(':id')
  @Roles(Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE, Rol.DESARROLLADOR)
  @ApiOperation({
    summary: 'Eliminar un archivo RedeBan (y sus registros asociados)',
  })
  @ApiParam({ name: 'id', type: Number, example: 3 })
  @ApiResponse({
    status: 200,
    description: 'Archivo eliminado correctamente',
    schema: { example: { ok: true, deletedId: 3 } },
  })
  @ApiResponse({
    status: 404,
    description: 'No existe el archivo RedeBan con ese ID',
  })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  @ApiForbiddenResponse({ description: 'Token válido pero rol no permitido' })
  async deleteArchivo(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.redebanService.deleteArchivo(id, Number(req.user.sub));
  }
}