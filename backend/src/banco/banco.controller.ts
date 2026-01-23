import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  Delete,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '@prisma/client';

import { BancoService } from './banco.service';
import { UploadBancoDto } from './dto/upload-banco.dto';

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

function filenameFactory(_req: any, file: Express.Multer.File, cb: any) {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  cb(null, `${unique}${extname(file.originalname)}`);
}

@ApiTags('Banco')
@ApiBearerAuth()
@Controller('banco')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BancoController {
  constructor(private readonly bancoService: BancoService) {}

  /**
   * Form-data:
   * - file: xls/xlsx
   * - fechaArchivo: YYYY-MM-DD
   * - sucursalId: number ✅ obligatorio
   */
  @Post('upload')
  @Roles(Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE, Rol.DESARROLLADOR)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: '/tmp/uploads/banco',
        filename: filenameFactory,
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  @ApiOperation({ summary: 'Subir y procesar archivo del banco (XLS/XLSX)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Carga de archivo Banco + metadata',
    schema: {
      type: 'object',
      required: ['file', 'fechaArchivo', 'sucursalId'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Archivo .xls o .xlsx',
        },
        fechaArchivo: {
          type: 'string',
          example: '2025-12-22',
          description: 'Fecha del archivo (YYYY-MM-DD)',
        },
        sucursalId: {
          type: 'number',
          example: 8,
          description: 'ID de sucursal (obligatorio)',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Archivo cargado y procesado',
    schema: {
      example: {
        id: '2',
        fecha_archivo: '2025-12-22T00:00:00.000Z',
        nombre_original: 'ConsultaDetallada.xls',
        ruta_archivo: '.../uploads/banco/2025-12-22/8/xxxx.xls',
        estado: 'PROCESADO',
        usuario_id: '1',
        created_at: '2025-12-29T17:53:21.705Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Faltan campos / archivo inválido / formato no soportado',
  })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  @ApiForbiddenResponse({ description: 'Token válido pero rol no permitido' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadBancoDto,
    @Req() req: any,
  ) {
    return this.bancoService.uploadAndProcess({
      file,
      fechaArchivo: body.fechaArchivo,
      sucursalId: body.sucursalId,
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
  @ApiOperation({ summary: 'Listar archivos de banco cargados' })
  @ApiResponse({
    status: 200,
    description: 'Lista de archivos banco',
    schema: {
      example: [
        {
          id: '2',
          fecha_archivo: '2025-12-22T00:00:00.000Z',
          nombre_original: 'ConsultaDetallada.xls',
          estado: 'PROCESADO',
          created_at: '2025-12-29T17:53:21.705Z',
        },
      ],
    },
  })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  async list() {
    return this.bancoService.listArchivosBanco();
  }

  @Get(':id')
  @Roles(
    Rol.OPERATIVO,
    Rol.ADMIN,
    Rol.PROPIETARIO,
    Rol.SOPORTE,
    Rol.DESARROLLADOR,
  )
  @ApiOperation({ summary: 'Obtener detalle de un archivo banco por ID' })
  @ApiParam({ name: 'id', type: Number, example: 2 })
  @ApiResponse({
    status: 200,
    description: 'Archivo banco encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'No existe el archivo banco con ese ID',
  })
  @ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.bancoService.getArchivoBancoById(id);
  }
  @Delete(':id')
@Roles(Rol.ADMIN, Rol.PROPIETARIO)
@ApiOperation({ 
  summary: 'Eliminar archivo banco y sus registros',
  description: 'Elimina permanentemente un archivo del banco y todos sus registros detallados. Solo ADMIN y PROPIETARIO.'
})
@ApiParam({ 
  name: 'id', 
  type: Number,
  example: 2,
  description: 'ID del archivo banco'
})
@ApiResponse({ 
  status: 200, 
  description: 'Archivo eliminado correctamente',
  schema: {
    example: {
      message: 'Archivo banco eliminado correctamente',
      id: '2'
    }
  }
})
@ApiResponse({ status: 404, description: 'Archivo no encontrado' })
@ApiUnauthorizedResponse({ description: 'Falta token o token inválido' })
@ApiForbiddenResponse({ description: 'Rol no autorizado' })
async delete(@Param('id', ParseIntPipe) id: number) {
  return this.bancoService.deleteArchivoBanco(id);
}
}
