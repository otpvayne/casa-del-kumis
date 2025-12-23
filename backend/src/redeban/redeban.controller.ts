import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
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
import { RedeBanService } from './redeban.service';

function filenameFactory(_req: any, file: Express.Multer.File, cb: any) {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  cb(null, `${unique}${extname(file.originalname)}`);
}

@Controller('redeban')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RedeBanController {
  constructor(private readonly redebanService: RedeBanService) {}

  // ✅ Subir archivo RedeBan (OPERATIVO, ADMIN, PROPIETARIO, SOPORTE)
  @Post('upload')
  @Roles(Rol.OPERATIVO, Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/redeban',
        filename: filenameFactory,
      }),
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    }),
  )
  async uploadRedeBan(
    @UploadedFile() file: Express.Multer.File,
    @Body()
    body: {
      fechaConciliacion: string; // YYYY-MM-DD
      sucursalId?: string; // opcional
    },
    @Req() req: any,
  ) {
    return this.redebanService.uploadAndProcess({
      file,
      fechaConciliacion: body.fechaConciliacion,
      sucursalId: body.sucursalId ? Number(body.sucursalId) : undefined,
      userId: Number(req.user.sub),
    });
  }

  // ✅ Ver metadata del archivo RedeBan
  @Get('files/:id')
  @Roles(Rol.OPERATIVO, Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE, Rol.DESARROLLADOR)
  async getArchivo(@Param('id', ParseIntPipe) id: number) {
    return this.redebanService.getArchivo(id);
  }

  // ✅ Ver archivo + registros parseados
  @Get('files/:id/rows')
  @Roles(Rol.OPERATIVO, Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE, Rol.DESARROLLADOR)
  async getArchivoConRegistros(@Param('id', ParseIntPipe) id: number) {
    return this.redebanService.getArchivoConRegistros(id);
  }

  // ✅ Listar archivos (filtro por fecha opcional)
  // Ej: GET /redeban/files?fecha=2025-12-17&take=50&skip=0
  @Get('files')
  @Roles(Rol.OPERATIVO, Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE, Rol.DESARROLLADOR)
  async listArchivos(
    @Query('fecha') fecha?: string,
    @Query('take') take?: string,
    @Query('skip') skip?: string,
  ) {
    return this.redebanService.listArchivos({
      fecha: fecha || undefined,
      take: take ? Number(take) : undefined,
      skip: skip ? Number(skip) : undefined,
    });
  }

  // ✅ Eliminar archivo (ADMIN/PROPIETARIO)
  @Post('files/:id/delete')
  @Roles(Rol.ADMIN, Rol.PROPIETARIO)
  async deleteArchivo(@Param('id', ParseIntPipe) id: number) {
    return this.redebanService.deleteArchivo(id);
  }
}
