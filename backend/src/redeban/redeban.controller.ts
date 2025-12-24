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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Delete } from '@nestjs/common';
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

  @Post('upload')
  @Roles(Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE, Rol.DESARROLLADOR)
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
    @Body() body: { fechaConciliacion: string },
    @Req() req: any,
  ) {
    return this.redebanService.uploadAndProcess({
      file,
      fechaConciliacion: body.fechaConciliacion,
      userId: Number(req.user.sub),
    });
  }

  @Get()
  @Roles(Rol.OPERATIVO, Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE, Rol.DESARROLLADOR)
  async list() {
    return this.redebanService.listArchivos();
  }

  @Get(':id')
  @Roles(Rol.OPERATIVO, Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE, Rol.DESARROLLADOR)
  async getById(@Param('id', ParseIntPipe) id: number) {
    return this.redebanService.getArchivoById(id);
  }
  // ✅ DELETE archivo RedeBan
@Delete(':id')
@Roles(Rol.ADMIN, Rol.PROPIETARIO, Rol.SOPORTE, Rol.DESARROLLADOR)
async deleteArchivo(
  @Param('id', ParseIntPipe) id: number,
  @Req() req: any,
) {
  return this.redebanService.deleteArchivo(id, Number(req.user.sub));
}

}
