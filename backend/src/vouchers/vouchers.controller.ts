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
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Rol } from '@prisma/client';

import { VouchersService } from './vouchers.service';
import { UpdateVoucherDraftDto } from './dto/update-voucher-draft.dto';
import { multerVoucherTmpConfig } from './multer-vouchers.config';

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
  async getVoucher(@Param('id', ParseIntPipe) id: number) {
    return this.vouchersService.getVoucher(id);
  }

  @Patch(':id/draft')
  @Roles(Rol.OPERATIVO, Rol.ADMIN, Rol.PROPIETARIO)
  async updateVoucherDraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateVoucherDraftDto,
  ) {
    return this.vouchersService.updateVoucherDraft(id, body);
  }

  @Post(':id/confirm')
  @Roles(Rol.ADMIN, Rol.PROPIETARIO, Rol.OPERATIVO)
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
  @Roles(Rol.ADMIN, Rol.DESARROLLADOR)
  async deleteVoucher(@Param('id', ParseIntPipe) id: number) {
    return this.vouchersService.deleteVoucher(id);
  }
}
