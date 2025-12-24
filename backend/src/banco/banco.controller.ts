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

function filenameFactory(_req: any, file: Express.Multer.File, cb: any) {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  cb(null, `${unique}${extname(file.originalname)}`);
}

@Controller('banco')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BancoController {
  constructor(private readonly bancoService: BancoService) {}

  // Form-data:
  // - file: xls/xlsx
  // - fechaArchivo: YYYY-MM-DD
  // - sucursalId: number  ✅ obligatorio
  @Post('upload')
  @Roles(Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE, Rol.DESARROLLADOR)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/banco',
        filename: filenameFactory,
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadBancoDto,
    @Req() req: any,
  ) {
    return this.bancoService.uploadAndProcess({
      file,
      fechaArchivo: body.fechaArchivo,
      sucursalId: body.sucursalId, // ✅ ya es number (no string)
      userId: Number(req.user.sub),
    });
  }

  @Get()
  @Roles(Rol.OPERATIVO, Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE, Rol.DESARROLLADOR)
  async list() {
    return this.bancoService.listArchivosBanco();
  }

  @Get(':id')
  @Roles(Rol.OPERATIVO, Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE, Rol.DESARROLLADOR)
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.bancoService.getArchivoBancoById(id);
  }
}
