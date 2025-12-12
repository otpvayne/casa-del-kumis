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
import { VouchersService } from './vouchers.service';

function filenameFactory(_req: any, file: Express.Multer.File, cb: any) {
  const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
  cb(null, `${unique}${extname(file.originalname)}`);
}

@Controller('vouchers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  // ✅ Subir voucher (OPERATIVO, ADMIN, PROPIETARIO)
  @Post('upload')
  @Roles(Rol.OPERATIVO, Rol.ADMIN, Rol.PROPIETARIO)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/vouchers',
        filename: filenameFactory,
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  async uploadVoucher(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { sucursalId: string; fechaOperacion: string },
    @Req() req: any,
  ) {
    return this.vouchersService.uploadAndProcess({
      file,
      sucursalId: Number(body.sucursalId),
      fechaOperacion: body.fechaOperacion, // "YYYY-MM-DD"
      userId: Number(req.user.sub),
    });
  }

  // ✅ Ver voucher + transacciones
  @Get(':id')
  @Roles(Rol.OPERATIVO, Rol.ADMIN, Rol.PROPIETARIO, Rol.DESARROLLADOR, Rol.SOPORTE)
  async getVoucher(@Param('id', ParseIntPipe) id: number) {
    return this.vouchersService.getVoucher(id);
  }

  // ✅ Confirmar voucher (ADMIN/PROPIETARIO)
  @Post(':id/confirm')
  @Roles(Rol.ADMIN, Rol.PROPIETARIO)
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
}
